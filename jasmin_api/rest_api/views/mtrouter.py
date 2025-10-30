from collections import OrderedDict

from django.conf import settings
from django.http import JsonResponse
from django.utils.datastructures import MultiValueDictKeyError

from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from rest_api.tools import set_ikeys, split_cols
from rest_api.exceptions import (JasminSyntaxError, JasminError,
                        UnknownError, MissingKeyError,
                        MutipleValuesRequiredKeyError, ObjectNotFoundError)
from rest_api.serializers import (
    MTRouterListSerializer, MTRouterDetailSerializer,
    MTRouterCreateSerializer, SimpleResponseSerializer
)

STANDARD_PROMPT = settings.STANDARD_PROMPT
INTERACTIVE_PROMPT = settings.INTERACTIVE_PROMPT

@extend_schema(tags=['Routers - MT'])
class MTRouterViewSet(ViewSet):
    "Viewset for managing MT Routes"
    lookup_field = 'order'
    serializer_class = MTRouterListSerializer

    def _list(self, telnet):
        "List MT router as python dict"
        telnet.sendline('mtrouter -l')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        result = telnet.match.group(0).strip().replace("\r", '').split("\n")
        if len(result) < 3:
            return {'mtrouters': []}
        results = [l.replace(', ', ',').replace('(!)', '')
            for l in result[2:-2] if l]
        routers = split_cols(results)
        return {
            'mtrouters':
                [
                    {
                        'order': r[0].strip().lstrip('#'),
                        'type': r[1],
                        'rate': r[2],
                        'connectors': [c.strip() for c in r[3].split(',')],
                        'filters': [c.strip() for c in ' '.join(r[4:]).split(',')
                            ] if len(r) > 3 else []
                    } for r in routers
                ]
        }

    @extend_schema(
        responses=MTRouterListSerializer,
        description="List all MT routers"
    )
    def list(self, request):
        "List MT Routers. No parameters"
        return JsonResponse(self._list(request.telnet))

    def get_router(self, telnet, order):
        "Return data for one mtrouter as Python dict"
        routers = self._list(telnet)['mtrouters']
        try:
            return {'mtrouter':
                next((m for m in routers if m['order'] == order), None)
            }
        except StopIteration:
            raise ObjectNotFoundError('No MTRouter with order: %s' % order)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='order',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Router order'
            )
        ],
        responses=MTRouterDetailSerializer,
        description="Retrieve details for a specific MT router"
    )
    def retrieve(self, request, order):
        "Details for one MTRouter by order (integer)"
        return JsonResponse(self.get_router(request.telnet, order))


    @extend_schema(
        responses=MTRouterListSerializer,
        description="Flush entire MT routing table"
    )
    @action(detail=False, methods=['delete'])
    def flush(self, request):
        "Flush entire routing table"
        telnet = request.telnet
        telnet.sendline('mtrouter -f')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'mtrouters': []})

    @extend_schema(
        request=MTRouterCreateSerializer,
        responses=MTRouterDetailSerializer,
        description="Create a new MT router"
    )
    def create(self, request):
        """Create MTRouter.
        Required parameters: type, order, smppconnectors, httpconnectors
        More than one connector is allowed only for RandomRoundrobinMTRoute
        """
        telnet = request.telnet
        data = request.data
        try:
            rtype, order, rate = data['type'], data['order'], data['rate']
        except IndexError:
            raise MissingKeyError(
                'Missing parameter: type or order required')
        rtype = rtype.lower()
        telnet.sendline('mtrouter -a')
        telnet.expect(r'Adding a new MT Route(.+)\n' + INTERACTIVE_PROMPT)
        ikeys = OrderedDict({'type': rtype})
        if rtype != 'defaultroute':
            try:
                filters = data['filters'].split(',')
            except MultiValueDictKeyError:
                raise MissingKeyError('%s router requires filters' % rtype)
            ikeys['filters'] = ';'.join(filters)
            ikeys['order'] = order
        smppconnectors = data.get('smppconnectors', '')
        httpconnectors = data.get('httpconnectors', '')
        connectors = ['smppc(%s)' % c.strip()
                for c in smppconnectors.split(',') if c.strip()
            ] + ['http(%s)' % c for c in httpconnectors.split(',') if c.strip()]
        if rtype == 'randomroundrobinmtroute':
            if len(connectors) < 2:
                raise MutipleValuesRequiredKeyError(
                    'Round Robin route requires at least two connectors')
            ikeys['connectors'] = ';'.join(connectors)
        else:
            if len(connectors) != 1:
                raise MissingKeyError('one and only one connector required')
            ikeys['connector'] = connectors[0]
        ikeys['rate'] = rate
        print(ikeys)
        set_ikeys(telnet, ikeys)
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'mtrouter': self.get_router(telnet, order)})

    def simple_mtrouter_action(self, telnet, action, order, return_mtroute=True):
        telnet.sendline('mtrouter -%s %s' % (action, order))
        matched_index = telnet.expect([
            r'.+Successfully(.+)' + STANDARD_PROMPT,
            r'.+Unknown MT Route: (.+)' + STANDARD_PROMPT,
            r'.+(.*)' + STANDARD_PROMPT,
        ])
        if matched_index == 0:
            telnet.sendline('persist\n')
            if return_mtroute:
                telnet.expect(r'.*' + STANDARD_PROMPT)
                return JsonResponse({'mtrouter': self.get_router(telnet, order)})
            else:
                return JsonResponse({'order': order})
        elif matched_index == 1:
            raise UnknownError(detail='No router:' +  order)
        else:
            raise JasminError(telnet.match.group(1))

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='order',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Router order'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Delete an MT router"
    )
    def destroy(self, request, order):
        """Delete a mtrouter. One parameter required, the router identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent router
        - 400: other error
        """
        return self.simple_mtrouter_action(
            request.telnet, 'r', order, return_mtroute=False)
