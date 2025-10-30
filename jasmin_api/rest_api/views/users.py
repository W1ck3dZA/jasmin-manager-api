from django.conf import settings
from django.http import JsonResponse

from rest_framework.viewsets import ViewSet
from rest_framework.parsers import JSONParser
from rest_framework.decorators import action, parser_classes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from rest_api.tools import set_ikeys
from rest_api.exceptions import (JasminSyntaxError, JasminError,
                        UnknownError, MissingKeyError,
                        ObjectNotFoundError)
from rest_api.serializers import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, SimpleResponseSerializer
)

STANDARD_PROMPT = settings.STANDARD_PROMPT
INTERACTIVE_PROMPT = settings.INTERACTIVE_PROMPT

@extend_schema(tags=['Users'])
class UserViewSet(ViewSet):
    "ViewSet for managing *Jasmin* users (*not* Django auth users)"
    lookup_field = 'uid'
    serializer_class = UserListSerializer

    def get_user(self, telnet, uid, silent=False):
        """Gets a single users data
        silent supresses Http404 exception if user not found"""
        telnet.sendline('user -s ' + uid)
        matched_index = telnet.expect([
                r'.+Unknown User:.*' + STANDARD_PROMPT,
                r'.+Usage: user.*' + STANDARD_PROMPT,
                r'(.+)\n' + STANDARD_PROMPT,
        ])
        if matched_index != 2:
            if silent:
                return
            else:
                raise ObjectNotFoundError('Unknown user: %s' % uid)
        result = telnet.match.group(1)
        user = {}
        for line in [l for l in result.splitlines() if l][1:]:
            d = [x for x in line.split() if x]
            if len(d) == 2:
                user[d[0]] = d[1]
            elif len(d) == 4:
                #Not DRY, could be more elegant
                if not d[0] in user:
                    user[d[0]] = {}
                if not d[1] in user[d[0]]:
                    user[d[0]][d[1]] = {}
                if not d[2] in user[d[0]][d[1]]:
                    user[d[0]][d[1]][d[2]] = {}
                user[d[0]][d[1]][d[2]] = d[3]
            #each line has two or four lines so above exhaustive
        return user

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=UserDetailSerializer,
        description="Retrieve details for a specific user"
    )
    def retrieve(self, request, uid):
        "Retrieve data for one user"
        return JsonResponse({'user': self.get_user(request.telnet, uid)})

    @extend_schema(
        responses=UserListSerializer,
        description="List all users"
    )
    def list(self, request):
        "List users. No parameters"
        telnet = request.telnet
        telnet.sendline('user -l')
        telnet.expect([r'(.+)\n' + STANDARD_PROMPT])
        result = telnet.match.group(0).strip()
        if len(result) < 3:
            return JsonResponse({'users': []})

        results = [l for l in result.splitlines() if l]
        annotated_uids = [u.split(None, 1)[0][1:] for u in results[2:-2]]
        users = []
        for auid in annotated_uids:
            if auid[0] == '!':
                udata = self.get_user(telnet, auid[1:], True)
                udata['status'] = 'disabled'
            else:
                udata = self.get_user(telnet, auid, True)
                udata['status'] = 'enabled'
            users.append(udata)
        return JsonResponse(
            {
                #return users skipping None (== nonexistent user)
                'users': [u for u in users if u]
            }
        )

    @extend_schema(
        request=UserCreateSerializer,
        responses=UserDetailSerializer,
        description="Create a new user"
    )
    def create(self, request):
        """Create a User.
        Required parameters: username, password, uid (user identifier), gid (group identifier)
        """
        telnet = request.telnet
        data = request.data
        try:
            uid, gid, username, password = \
                data['uid'], data['gid'], data['username'], data['password']
        except Exception:
            raise MissingKeyError('Missing parameter: uid, gid, username and/or password required')
        telnet.sendline('user -a')
        telnet.expect(r'Adding a new User(.+)\n' + INTERACTIVE_PROMPT)
        set_ikeys(
            telnet,
            {
                'uid': uid, 'gid': gid, 'username': username,
                'password': password
            }
        )
        telnet.sendline('persist\n')
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'user': self.get_user(telnet, uid)})

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        request=UserUpdateSerializer,
        responses=UserDetailSerializer,
        description="Update user attributes"
    )
    @parser_classes((JSONParser,))
    def partial_update(self, request, uid):
        """Update some user attributes

        JSON requests only. The updates parameter is a list of lists.
        Each list is a list of valid arguments to user update. For example:

        * ["gid", "mygroup"] will set the user's group to mygroup
        * ["mt_messaging_cred", "authorization", "smpps_send", "False"]
        will remove the user privilege to send SMSs through the SMPP API.
        """
        telnet = request.telnet
        telnet.sendline('user -u ' + uid)
        matched_index = telnet.expect([
            r'.*Updating User(.*)' + INTERACTIVE_PROMPT,
            r'.*Unknown User: (.*)' + STANDARD_PROMPT,
            r'.+(.*)(' + INTERACTIVE_PROMPT + '|' + STANDARD_PROMPT + ')',
        ])
        if matched_index == 1:
            raise UnknownError(detail='Unknown user:' + uid)
        if matched_index != 0:
            raise JasminError(detail=" ".join(telnet.match.group(0).split()))
        updates = request.data
        if not ((type(updates) is list) and (len(updates) >= 1)):
            raise JasminSyntaxError('updates should be a list')
        for update in updates:
            if not ((type(update) is list) and (len(update) >= 1)):
                raise JasminSyntaxError("Not a list: %s" % update)
            telnet.sendline(" ".join([x for x in update]))
            matched_index = telnet.expect([
                r'.*(Unknown User key:.*)' + INTERACTIVE_PROMPT,
                r'.*(Error:.*)' + STANDARD_PROMPT,
                r'.*' + INTERACTIVE_PROMPT,
                r'.+(.*)(' + INTERACTIVE_PROMPT + '|' + STANDARD_PROMPT + ')',
            ])
            if matched_index != 2:
                raise JasminSyntaxError(
                    detail=" ".join(telnet.match.group(1).split()))
        telnet.sendline('ok')
        ok_index = telnet.expect([
            r'(.*)' + INTERACTIVE_PROMPT,
            r'.*' + STANDARD_PROMPT,
        ])
        if ok_index == 0:
            raise JasminSyntaxError(
                detail=" ".join(telnet.match.group(1).split()))
        telnet.sendline('persist\n')
        #Not sure why this needs to be repeated
        telnet.expect(r'.*' + STANDARD_PROMPT)
        return JsonResponse({'user': self.get_user(telnet, uid)})

    def simple_user_action(self, telnet, action, uid, return_user=True):
        telnet.sendline('user -%s %s' % (action, uid))
        matched_index = telnet.expect([
            r'.+Successfully(.+)' + STANDARD_PROMPT,
            r'.+Unknown User: (.+)' + STANDARD_PROMPT,
            r'.+(.*)' + STANDARD_PROMPT,
        ])
        if matched_index == 0:
            telnet.sendline('persist\n')
            if return_user:
                telnet.expect(r'.*' + STANDARD_PROMPT)
                return JsonResponse({'user': self.get_user(telnet, uid)})
            else:
                return JsonResponse({'uid': uid})
        elif matched_index == 1:
            raise UnknownError(detail='No user:' +  uid)
        else:
            raise JasminError(telnet.match.group(1))

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=SimpleResponseSerializer,
        description="Delete a user"
    )
    def destroy(self, request, uid):
        """Delete a user. One parameter required, the user identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent user
        - 400: other error
        """
        return self.simple_user_action(
            request.telnet, 'r', uid, return_user=False)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=UserDetailSerializer,
        description="Enable a user"
    )
    @action(detail=True, methods=['put'])
    def enable(self, request, uid):
        """Enable a user. One parameter required, the user identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent user
        - 400: other error
        """
        return self.simple_user_action(request.telnet, 'e', uid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=UserDetailSerializer,
        description="Disable a user"
    )
    @action(detail=True, methods=['put'])
    def disable(self, request, uid):
        """Disable a user.

        One parameter required, the user identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful deletion
        - 404: nonexistent user
        - 400: other error
        """
        return self.simple_user_action(request.telnet, 'd', uid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=UserDetailSerializer,
        description="Unbind user from SMPP server"
    )
    @action(detail=True, methods=['put'])
    def smpp_unbind(self, request, uid):
        """Unbind user from smpp server

        One parameter required, the user identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful unbind
        - 404: nonexistent user
        - 400: other error
        """
        return self.simple_user_action(request.telnet, '-smpp-unbind', uid)

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='uid',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='User identifier'
            )
        ],
        responses=UserDetailSerializer,
        description="Ban and unbind user from SMPP server"
    )
    @action(detail=True, methods=['put'])
    def smpp_ban(self, request, uid):
        """Unbind and ban user from smpp server

        One parameter required, the user identifier (a string)

        HTTP codes indicate result as follows

        - 200: successful ban and unbind
        - 404: nonexistent user
        - 400: other error
        """
        return self.simple_user_action(request.telnet, '-smpp-ban', uid)
