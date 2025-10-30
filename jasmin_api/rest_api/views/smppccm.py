from django.conf import settings
from django.http import JsonResponse

from rest_framework.viewsets import ViewSet
from rest_framework.parsers import JSONParser
from rest_framework.decorators import action, parser_classes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from rest_api.tools import set_ikeys, split_cols
from rest_api.exceptions import (
    JasminSyntaxError, JasminError, ActionFailed,
    ObjectNotFoundError, UnknownError, 
)
from rest_api.serializers import (
    SMPPCCMListSerializer, SMPPCCMCreateSerializer, SimpleResponseSerializer
)

STANDARD_PROMPT = settings.STANDARD_PROMPT
INTERACTIVE_PROMPT = settings.INTERACTIVE_PROMPT


@extend_schema(tags=['Connectors - SMPP'])
class SMPPCCMViewSet(ViewSet):
    "Viewset for managing SMPP Client Connectors"
    lookup_field = 'cid'
    serializer_class = SMPPCCMListSerializer

    def get_smppccm(self, telnet, cid, silent=False):
        #Some of this could be abstracted out - similar pattern in users.py
        telnet.sendline('smppccm -s ' + cid)
        matched_index = telnet.expect([
                r'.+Unknown connector:.*' + STANDARD_PROMPT,
                r'.+Usage:.*' + STANDARD_PROMPT,
                r'(.+)\n' + STANDARD_PROMPT,
        ])
        if matched_index != 2:
            if silent:
                return
            else:
                raise ObjectNotFoundError('Unknown connector: %s' % cid)
        result = telnet.match.group(1)
        smppccm = {}
        for line in result.splitlines():
            d = [x for x in line.split() if x]
            if len(d) == 2:
                smppccm[d[0]] = d[1]
        return smppccm

    def get_connector_list(self, telnet):
        telnet.sendline('smppccm -l')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        result = telnet.match.group(0).strip().replace("\r", '').split("\n")
        if len(result) < 3:
            return []
        return split_cols(result[2:-2])

    def simple_smppccm_action(self, telnet, action, cid):
        telnet.sendline('smppccm -%s %s' % (action, cid))
        matched_index = telnet.expect([
            r'.+Successfully(.+)' + STANDARD_PROMPT,
            r'.+Unknown connector: (.+)' + STANDARD_PROMPT,
            r'(.*)' + STANDARD_PROMPT,
        ])
        if matched_index == 0:
            telnet.sendline('persist\n')
            return JsonResponse({'name': cid})
        elif matched_index == 1:
            raise ObjectNotFoundError('Unknown SMPP Connector: %s' % cid)
        else:
            raise ActionFailed(telnet.match.group(1))

    @extend_schema(
        responses=SMPPCCMListSerializer,
        description="List all SMPP Client Connectors"
    )
    def list(self, request):
        """List SMPP Client Connectors. No parameters
        Differs from slightly from telent CLI names and values:

        1. the "service" column is called "status"
        2. the cid is the full connector id of the form smpps(cid)
        """
        telnet = request.telnet
        connector_list = self.get_connector_list(telnet)
        connectors = []
        for raw_data in connector_list:
            if raw_data[0][0] == '#':
                cid = raw_data[0][1:]
                connector = self.get_smppccm(telnet, cid, True)
                connector.update(
                    cid=cid,
                    status=raw_data[1],
                    session=raw_data[2],
                    starts=raw_data[3],
                    stops=raw_data[4]
                )
                connectors.append(connector)
        return JsonResponse({'connectors': connectors})

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='cid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Connector identifier'
            )
        ],
        responses={'connector': SMPPCCMListSerializer},
        description="Retrieve details for a specific SMPP connector"
    )
    def retrieve(self, request, cid):
        """Retreive data for one connector
        Required parameter: cid (connector id)"""
        telnet = request.telnet
        connector = self.get_smppccm(telnet, cid, silent=False)
        connector_list = self.get_connector_list(telnet)
        list_data = next(
            (raw_data for raw_data in connector_list if
                raw_data[0] == '#' + cid),
            None
        )
        connector.update(
            cid=cid,
            status=list_data[1],
            session=list_data[2],
            starts=list_data[3],
            stops=list_data[4]
        )
        return JsonResponse({'connector': connector})

    @extend_schema(
        request=SMPPCCMCreateSerializer,
        responses=SimpleResponseSerializer,
        description="Create a new SMPP Client Connector"
    )
    def create(self, request):
        """Create an SMPP Client Connector.
        Required parameter: cid (connector id)
        """
        telnet = request.telnet

        telnet.sendline('smppccm -a')
        updates = request.data
        for k, v in updates.items():
            if not ((type(updates) is dict) and (len(updates) >= 1)):
                raise JasminSyntaxError('updates should be a a key value array')
            telnet.sendline("%s %s" % (k, v))
            matched_index = telnet.expect([
                r'.*(Unknown SMPPClientConfig key:.*)' + INTERACTIVE_PROMPT,
                r'.*(Error:.*)' + STANDARD_PROMPT,
                r'.*' + INTERACTIVE_PROMPT,
                r'.+(.*)(' + INTERACTIVE_PROMPT + '|' + STANDARD_PROMPT + ')',
            ])
            if matched_index != 2:
                raise JasminSyntaxError(
                    detail=" ".join(telnet.match.group(1).split()))
        telnet.sendline('ok')
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'cid': request.data['cid']})

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='cid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Connector identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Delete an SMPP connector"
    )
    def destroy(self, request, cid):
        """Delete an smpp connector.
        One parameter required, the connector identifier

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent group
        - 400: other error
        """
        return self.simple_smppccm_action(request.telnet, 'r', cid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='cid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Connector identifier'
            )
        ],
        request={
            'application/json': {
                'type': 'object',
                'description': 'Key-value pairs to update'
            }
        },
        responses={'connector': SMPPCCMListSerializer},
        description="Update SMPP connector attributes"
    )
    @parser_classes((JSONParser,))
    def partial_update(self, request, cid):
        """Update some SMPP connector attributes

        JSON requests only. The updates parameter is a key value array
        """
        telnet = request.telnet
        telnet.sendline('smppccm -u ' + cid)
        matched_index = telnet.expect([
            r'.*Updating connector(.*)' + INTERACTIVE_PROMPT,
            r'.*Unknown connector: (.*)' + STANDARD_PROMPT,
            r'.+(.*)(' + INTERACTIVE_PROMPT + '|' + STANDARD_PROMPT + ')',
        ])
        if matched_index == 1:
            raise UnknownError(detail='Unknown connector:' + cid)
        if matched_index != 0:
            raise JasminError(detail=" ".join(telnet.match.group(0).split()))
        updates = request.data
        for k, v in updates.items():
            if not ((type(updates) is dict) and (len(updates) >= 1)):
                raise JasminSyntaxError('updates should be a a key value array')
            telnet.sendline("%s %s" % (k, v))
            matched_index = telnet.expect([
                r'.*(Unknown SMPPClientConfig key:.*)' + INTERACTIVE_PROMPT,
                r'.*(Error:.*)' + STANDARD_PROMPT,
                r'.*' + INTERACTIVE_PROMPT,
                r'.+(.*)(' + INTERACTIVE_PROMPT + '|' + STANDARD_PROMPT + ')',
            ])
            if matched_index != 2:
                raise JasminSyntaxError(
                    detail=" ".join(telnet.match.group(1).split()))
        telnet.sendline('ok')
        ok_index = telnet.expect([
            r'.*(Error:.*)' + STANDARD_PROMPT,
            r'(.*)' + INTERACTIVE_PROMPT,
            r'.*' + STANDARD_PROMPT,
        ])
        if ok_index == 0:
            raise JasminSyntaxError(
                detail=" ".join(telnet.match.group(1).split()))
        telnet.sendline('persist\n')
        #Not sure why this needs to be repeated, just as with user
        telnet.expect(r'.*' + STANDARD_PROMPT)

        return JsonResponse(
            {'connector': self.get_smppccm(telnet, cid, silent=False)})

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='cid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Connector identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Start SMPP connector"
    )
    @action(detail=True, methods=['put'])
    def start(self, request, cid):
        """Start SMPP Connector

        One parameter required, the connector identifier

        HTTP codes indicate result as follows

        - 200: successful start
        - 404: nonexistent connector
        - 400: other error - this includes failure to start because it is started.
        """
        return self.simple_smppccm_action(request.telnet, '1', cid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='cid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Connector identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Stop SMPP connector"
    )
    @action(detail=True, methods=['put'])
    def stop(self, request, cid):
        """Start SMPP Connector

        One parameter required, the connector identifier

        HTTP codes indicate result as follows

        - 200: successful start
        - 404: nonexistent connector
        - 400: other error - this includes failure to stop because it is stopped.
        """
        return self.simple_smppccm_action(request.telnet, '0', cid)
