import os

SETTINGS_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


################################################################################
#         Settings most likely to need overriding in local_settings.py         #
################################################################################

#Jasmin telnet defaults, override in local_settings.py
TELNET_HOST = '127.0.0.1'
TELNET_PORT = 8990
TELNET_USERNAME = 'jcliadmin'
TELNET_PW = 'jclipwd'  # no alternative storing as plain text
TELNET_TIMEOUT = 10  # reasonable value for intranet.


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.BasicAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

################################################################################
#                            Other settings                                    #
################################################################################


STANDARD_PROMPT = 'jcli : '  # There should be no need to change this
INTERACTIVE_PROMPT ='> '  # Prompt for interactive commands

#This should be OK for REST API - we are not generating URLs
#see https://www.djangoproject.com/weblog/2013/feb/19/security/#s-issue-host-header-poisoning
ALLOWED_HOSTS = ['*']

# Disable trailing slash requirement for API endpoints
APPEND_SLASH = False

SPECTACULAR_SETTINGS = {
    'TITLE': 'Jasmin Management REST API',
    'DESCRIPTION': 'A REST API for managing Jasmin SMS Gateway',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# Application definition

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'drf_spectacular',
    'rest_api',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'rest_api.middleware.TelnetConnectionMiddleware'
]

# CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://0.0.0.0:8081",
]

CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'jasmin_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'jasmin_api.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.8/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}


# Internationalization
# https://docs.djangoproject.com/en/1.8/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/1.8/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

with open(os.path.join(SETTINGS_DIR, 'local_settings.py')) as f:
    exec(f.read())
