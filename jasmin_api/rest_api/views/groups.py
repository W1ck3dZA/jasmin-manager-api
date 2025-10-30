from django.conf import settings
from django.http import JsonResponse
import logging

from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from rest_api.exceptions import MissingKeyError, ActionFailed, ObjectNotFoundError
from rest_api.serializers import (
    GroupListSerializer, GroupCreateSerializer, SimpleResponseSerializer
)
from rest_api.tools import set_ikeys

logger = logging.getLogger(__name__)

STANDARD_PROMPT = settings.STANDARD_PROMPT
INTERACTIVE_PROMPT = settings.INTERACTIVE_PROMPT

@extend_schema(tags=['Groups'])
class GroupViewSet(ViewSet):
    "ViewSet for managing *Jasmin* user groups (*not* Django auth groups)"
    lookup_field = 'gid'
    serializer_class = GroupListSerializer

    @extend_schema(
        responses=GroupListSerializer,
        description="List all groups"
    )
    def list(self, request):
        "List groups. No request parameters provided or required."
        telnet = request.telnet
        telnet.sendline('group -l')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        result = telnet.match.group(0).strip().replace("\r", '').split("\n")
        if len(result) < 3:
            return JsonResponse({'groups': []})
        groups = result[2:-2]
        return JsonResponse(
            {
                'groups':
                    [
                        {
                            'name': g.strip().lstrip('!#'), 'status': (
                                'disabled' if g[1] == '!' else 'enabled'
                            )
                        } for g in groups
                    ]
            }
        )

    @extend_schema(
        request=GroupCreateSerializer,
        responses=SimpleResponseSerializer,
        description="Create a new group"
    )
    def create(self, request):
        """Create a group.
        One POST parameter required, the group identifier (a string)
        """
        telnet = request.telnet
        
        if not 'gid' in request.data:
            raise MissingKeyError('Missing gid (group identifier)')
        
        gid = request.data['gid']
        
        telnet.sendline('group -a')
        telnet.expect(r'Adding a new Group(.+)\n' + INTERACTIVE_PROMPT)
        set_ikeys(telnet, {'gid': gid})
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'name': gid}, status=201)

    def simple_group_action(self, telnet, action, gid):
        telnet.sendline('group -%s %s' % (action, gid))
        matched_index = telnet.expect([
            r'.+Successfully(.+)' + STANDARD_PROMPT,
            r'.+Unknown Group: (.+)' + STANDARD_PROMPT,
            r'.+(.*)' + STANDARD_PROMPT,
        ])
        if matched_index == 0:
            telnet.sendline('persist\n')
            return JsonResponse({'name': gid})
        elif matched_index == 1:
            raise ObjectNotFoundError('Unknown group: %s' % gid)
        else:
            raise ActionFailed(telnet.match.group(1))

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='gid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Group identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Delete a group"
    )
    def destroy(self, request, gid):
        """Delete a group. One parameter required, the group identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent group
        - 400: other error
        """
        return self.simple_group_action(request.telnet, 'r', gid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='gid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Group identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Enable a group"
    )
    @action(detail=True, methods=['put'])
    def enable(self, request, gid):
        """Enable a group. One parameter required, the group identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent group
        - 400: other error
        """
        return self.simple_group_action(request.telnet, 'e', gid)


    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='gid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='Group identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Disable a group"
    )
    @action(detail=True, methods=['put'])
    def disable(self, request, gid):
        """Disable a group.

        One parameter required, the group identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent group
        - 400: other error
        """
        return self.simple_group_action(request.telnet, 'd', gid)
