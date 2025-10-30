from rest_framework import serializers


class FilterSerializer(serializers.Serializer):
    """Serializer for Filter objects"""
    fid = serializers.CharField(help_text="Filter identifier")
    type = serializers.CharField(help_text="Filter type")
    routes = serializers.CharField(help_text="Routes information")
    description = serializers.CharField(help_text="Filter description")


class FilterListSerializer(serializers.Serializer):
    """Serializer for list of filters"""
    filters = FilterSerializer(many=True)


class FilterDetailSerializer(serializers.Serializer):
    """Serializer for single filter detail"""
    filter = FilterSerializer()


class FilterCreateSerializer(serializers.Serializer):
    """Serializer for creating a filter"""
    type = serializers.ChoiceField(
        choices=[
            'TransparentFilter', 'ConnectorFilter', 'UserFilter', 
            'GroupFilter', 'SourceAddrFilter', 'DestinationAddrFilter',
            'ShortMessageFilter', 'DateIntervalFilter', 'TimeIntervalFilter',
            'TagFilter', 'EvalPyFilter'
        ],
        help_text="Filter type"
    )
    fid = serializers.CharField(help_text="Filter identifier")
    parameter = serializers.CharField(
        required=False,
        help_text="Parameter required for most filter types"
    )


class GroupSerializer(serializers.Serializer):
    """Serializer for Group objects"""
    name = serializers.CharField(help_text="Group name/identifier")
    status = serializers.ChoiceField(
        choices=['enabled', 'disabled'],
        help_text="Group status"
    )


class GroupListSerializer(serializers.Serializer):
    """Serializer for list of groups"""
    groups = GroupSerializer(many=True)


class GroupCreateSerializer(serializers.Serializer):
    """Serializer for creating a group"""
    gid = serializers.CharField(help_text="Group identifier")


class UserSerializer(serializers.Serializer):
    """Serializer for User objects"""
    uid = serializers.CharField(help_text="User identifier", required=False)
    gid = serializers.CharField(help_text="Group identifier", required=False)
    username = serializers.CharField(help_text="Username", required=False)
    status = serializers.ChoiceField(
        choices=['enabled', 'disabled'],
        help_text="User status",
        required=False
    )
    # Additional fields are dynamic based on user configuration
    
    class Meta:
        # Allow additional fields since user data structure is dynamic
        extra_kwargs = {'allow_null': True}


class UserListSerializer(serializers.Serializer):
    """Serializer for list of users"""
    users = UserSerializer(many=True)


class UserDetailSerializer(serializers.Serializer):
    """Serializer for single user detail"""
    user = UserSerializer()


class UserCreateSerializer(serializers.Serializer):
    """Serializer for creating a user"""
    uid = serializers.CharField(help_text="User identifier")
    gid = serializers.CharField(help_text="Group identifier")
    username = serializers.CharField(help_text="Username")
    password = serializers.CharField(
        help_text="Password",
        style={'input_type': 'password'}
    )


class UserUpdateSerializer(serializers.Serializer):
    """Serializer for updating a user"""
    updates = serializers.ListField(
        child=serializers.ListField(child=serializers.CharField()),
        help_text="List of update commands"
    )


class HTTPCCMSerializer(serializers.Serializer):
    """Serializer for HTTP Client Connector"""
    cid = serializers.CharField(help_text="Connector identifier")
    url = serializers.CharField(required=False, help_text="HTTP endpoint URL to send messages to")
    method = serializers.ChoiceField(
        choices=['GET', 'POST'],
        required=False,
        help_text="HTTP method to use (GET or POST)"
    )
    type = serializers.CharField(required=False, help_text="Connector type")


class HTTPCCMListSerializer(serializers.Serializer):
    """Serializer for list of HTTP connectors"""
    connectors = HTTPCCMSerializer(many=True)


class HTTPCCMCreateSerializer(serializers.Serializer):
    """Serializer for creating HTTP connector"""
    cid = serializers.CharField(help_text="Connector identifier (unique)")
    url = serializers.CharField(help_text="HTTP endpoint URL to send messages to")
    method = serializers.ChoiceField(
        choices=['GET', 'POST'],
        help_text="HTTP method to use (GET or POST)"
    )


class SMPPCCMSerializer(serializers.Serializer):
    """Serializer for SMPP Client Connector"""
    cid = serializers.CharField(help_text="Connector identifier")
    status = serializers.CharField(required=False, help_text="Connector status (started/stopped)")
    session = serializers.CharField(required=False, help_text="Session state (bound/unbound)")
    starts = serializers.CharField(required=False, help_text="Number of times connector has started")
    stops = serializers.CharField(required=False, help_text="Number of times connector has stopped")
    host = serializers.CharField(required=False, help_text="SMPP server host")
    port = serializers.IntegerField(required=False, help_text="SMPP server port")
    username = serializers.CharField(required=False, help_text="SMPP username")
    password = serializers.CharField(required=False, help_text="SMPP password")
    systemType = serializers.CharField(required=False, help_text="SMPP system type")
    systemId = serializers.CharField(required=False, help_text="SMPP system ID")


class SMPPCCMListSerializer(serializers.Serializer):
    """Serializer for list of SMPP connectors"""
    connectors = SMPPCCMSerializer(many=True)


class SMPPCCMCreateSerializer(serializers.Serializer):
    """Serializer for creating SMPP connector"""
    cid = serializers.CharField(help_text="Connector identifier (unique)")
    host = serializers.CharField(required=False, help_text="SMPP server host address")
    port = serializers.IntegerField(required=False, help_text="SMPP server port (default: 2775)")
    username = serializers.CharField(required=False, help_text="SMPP authentication username")
    password = serializers.CharField(required=False, help_text="SMPP authentication password")
    systemType = serializers.CharField(required=False, help_text="SMPP system type")
    systemId = serializers.CharField(required=False, help_text="SMPP system identifier")
    src_addr = serializers.CharField(required=False, help_text="Source address")
    src_ton = serializers.IntegerField(required=False, help_text="Source Type of Number")
    src_npi = serializers.IntegerField(required=False, help_text="Source Numbering Plan Indicator")
    dst_ton = serializers.IntegerField(required=False, help_text="Destination Type of Number")
    dst_npi = serializers.IntegerField(required=False, help_text="Destination Numbering Plan Indicator")
    bind = serializers.ChoiceField(
        choices=['transceiver', 'transmitter', 'receiver'],
        required=False,
        help_text="Bind mode (transceiver, transmitter, or receiver)"
    )


class MORouterSerializer(serializers.Serializer):
    """Serializer for MO Router"""
    order = serializers.CharField(help_text="Router order/priority (lower numbers = higher priority)")
    type = serializers.CharField(help_text="Router type (DefaultRoute, StaticMORoute, RandomRoundrobinMORoute)")
    connectors = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of connector identifiers"
    )
    filters = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of filter identifiers (not required for DefaultRoute)"
    )


class MORouterListSerializer(serializers.Serializer):
    """Serializer for list of MO routers"""
    morouters = MORouterSerializer(many=True)


class MORouterDetailSerializer(serializers.Serializer):
    """Serializer for single MO router detail"""
    morouter = MORouterSerializer()


class MORouterCreateSerializer(serializers.Serializer):
    """Serializer for creating MO router"""
    type = serializers.ChoiceField(
        choices=['DefaultRoute', 'StaticMORoute', 'RandomRoundrobinMORoute'],
        help_text="Router type - DefaultRoute (catch-all), StaticMORoute (single connector), or RandomRoundrobinMORoute (load balance across multiple connectors)"
    )
    order = serializers.CharField(help_text="Router order/priority - lower numbers have higher priority")
    smppconnectors = serializers.CharField(
        required=False,
        help_text="Comma-separated list of SMPP connector IDs (e.g., 'conn1,conn2')"
    )
    httpconnectors = serializers.CharField(
        required=False,
        help_text="Comma-separated list of HTTP connector IDs (e.g., 'http1,http2')"
    )
    filters = serializers.CharField(
        required=False,
        help_text="Comma-separated list of filter IDs - required for all types except DefaultRoute (e.g., 'filter1,filter2')"
    )


class MTRouterSerializer(serializers.Serializer):
    """Serializer for MT Router"""
    order = serializers.CharField(help_text="Router order/priority (lower numbers = higher priority)")
    type = serializers.CharField(help_text="Router type (DefaultRoute, StaticMTRoute, RandomRoundrobinMTRoute)")
    rate = serializers.CharField(help_text="Rate/cost for using this route (0 for free)")
    connectors = serializers.ListField(
        child=serializers.CharField(),
        help_text="List of connector identifiers"
    )
    filters = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="List of filter identifiers (not required for DefaultRoute)"
    )


class MTRouterListSerializer(serializers.Serializer):
    """Serializer for list of MT routers"""
    mtrouters = MTRouterSerializer(many=True)


class MTRouterDetailSerializer(serializers.Serializer):
    """Serializer for single MT router detail"""
    mtrouter = MTRouterSerializer()


class MTRouterCreateSerializer(serializers.Serializer):
    """Serializer for creating MT router"""
    type = serializers.ChoiceField(
        choices=['DefaultRoute', 'StaticMTRoute', 'RandomRoundrobinMTRoute'],
        help_text="Router type - DefaultRoute (catch-all), StaticMTRoute (single connector), or RandomRoundrobinMTRoute (load balance across multiple connectors)"
    )
    order = serializers.CharField(help_text="Router order/priority - lower numbers have higher priority")
    rate = serializers.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text="Rate/cost for using this route (use 0 for free routing)"
    )
    smppconnectors = serializers.CharField(
        required=False,
        help_text="Comma-separated list of SMPP connector IDs (e.g., 'conn1,conn2')"
    )
    httpconnectors = serializers.CharField(
        required=False,
        help_text="Comma-separated list of HTTP connector IDs (e.g., 'http1,http2')"
    )
    filters = serializers.CharField(
        required=False,
        help_text="Comma-separated list of filter IDs - required for all types except DefaultRoute (e.g., 'filter1,filter2')"
    )


class SimpleResponseSerializer(serializers.Serializer):
    """Generic serializer for simple responses with just an ID"""
    uid = serializers.CharField(required=False, help_text="User identifier")
    gid = serializers.CharField(required=False, help_text="Group identifier")
    fid = serializers.CharField(required=False, help_text="Filter identifier")
    cid = serializers.CharField(required=False, help_text="Connector identifier")
    order = serializers.IntegerField(required=False, help_text="Router order")
    name = serializers.CharField(required=False, help_text="Name/identifier")
