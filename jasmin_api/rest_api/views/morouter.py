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
    MORouterListSerializer, MORouterDetailSerializer, 
    MORouterCreateSerializer, SimpleResponseSerializer
)

STANDARD_PROMPT = settings.STANDARD_PROMPT
INTERACTIVE_PROMPT = settings.INTERACTIVE_PROMPT


@extend_schema(tags=['Routers - MO'])
class MORouterViewSet(ViewSet):
    "Viewset for managing MO Routes"
    lookup_field = 'order'
    serializer_class = MORouterListSerializer

    def _list(self, telnet):
        "List MO router as python dict"
        telnet.sendline('morouter -l')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        result = telnet.match.group(0).strip().replace("\r", '').split("\n")
        if len(result) < 3:
            return {'morouters': []}
        results = [l.replace(', ', ',').replace('(!)', '')
            for l in result[2:-2] if l]
        routers = split_cols(results)
        print(routers)
        return {
            'morouters':
                [
                    {
                        'order': r[0].strip().lstrip('#'),
                        'type': r[1],
                        'connectors': [c.strip() for c in r[2].split(',')],
                        'filters': [c.strip() for c in ' '.join(r[3:]).split(',')
                            ] if len(r) > 3 else []
                    } for r in routers
                ]
        }

    @extend_schema(
        responses=MORouterListSerializer,
        description="List all MO routers"
    )
    def list(self, request):
        "List MO routers. No parameters"
        return JsonResponse(self._list(request.telnet))

    def get_router(self, telnet, order):
        "Return data for one morouter as Python dict"
        morouters = self._list(telnet)['morouters']
        try:
            return {'morouter':
                next((m for m in morouters if m['order'] == order), None)
            }
        except StopIteration:
            raise ObjectNotFoundError('No MoROuter with order: %s' % order)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='order',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Router order'
            )
        ],
        responses=MORouterDetailSerializer,
        description="Retrieve details for a specific MO router"
    )
    def retrieve(self, request, order):
        "Details for one MORouter by order (integer)"
        return JsonResponse(self.get_router(request.telnet, order))


    @extend_schema(
        responses=MORouterListSerializer,
        description="Flush entire MO routing table"
    )
    @action(detail=False, methods=['delete'])
    def flush(self, request):
        "Flush entire routing table"
        telnet = request.telnet
        telnet.sendline('morouter -f')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'morouters': []})

    @extend_schema(
        request=MORouterCreateSerializer,
        responses=MORouterDetailSerializer,
        description="Create a new MO router"
    )
    def create(self, request):
        """Create MORouter.
        Required parameters: type, order, smppconnectors, httpconnectors
        More than one connector is allowed only for RandomRoundrobinMORoute
        """
        telnet = request.telnet
        data = request.data
        try:
            rtype, order = data['type'], data['order']
        except IndexError:
            raise MissingKeyError(
                'Missing parameter: type or order required')
        rtype = rtype.lower()
        telnet.sendline('morouter -a')
        telnet.expect(r'Adding a new MO Route(.+)\n' + INTERACTIVE_PROMPT)
        ikeys = OrderedDict({'type': rtype})
        if rtype != 'defaultroute':
            try:
                filters = data['filters'].split(',')
            except MultiValueDictKeyError:
                raise MissingKeyError('%s router requires filters' % rtype)
            ikeys['filters'] = ';'.join(filters)
            ikeys['order'] = order
            print(ikeys)
        smppconnectors = data.get('smppconnectors', '')
        httpconnectors = data.get('httpconnectors', '')
        connectors = ['smpps(%s)' % c.strip()
                for c in smppconnectors.split(',') if c.strip()
            ] + ['http(%s)' % c for c in httpconnectors.split(',') if c.strip()]
        if rtype == 'randomroundrobinmoroute':
            if len(connectors) < 2:
                raise MutipleValuesRequiredKeyError(
                    'Round Robin route requires at least two connectors')
            ikeys['connectors'] = ';'.join(connectors)
        else:
            if len(connectors) != 1:
                raise MissingKeyError('one and only one connector required')
            ikeys['connector'] = connectors[0]
        set_ikeys(telnet, ikeys)
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'morouter': self.get_router(telnet, order)})

    def simple_morouter_action(self, telnet, action, order, return_moroute=True):
        telnet.sendline('morouter -%s %s' % (action, order))
        matched_index = telnet.expect([
            r'.+Successfully(.+)' + STANDARD_PROMPT,
            r'.+Unknown MO Route: (.+)' + STANDARD_PROMPT,
            r'.+(.*)' + STANDARD_PROMPT,
        ])
        if matched_index == 0:
            telnet.sendline('persist\n')
            if return_moroute:
                telnet.expect(r'.*' + STANDARD_PROMPT)
                return JsonResponse({'morouter': self.get_router(telnet, order)})
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
        description="Delete an MO router"
    )
    def destroy(self, request, order):
        """Delete a morouter. One parameter required, the router identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent router
        - 400: other error
        """
        return self.simple_morouter_action(
            request.telnet, 'r', order, return_moroute=False)
