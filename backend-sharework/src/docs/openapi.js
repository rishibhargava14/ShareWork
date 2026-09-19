const errorShape = {
  type: 'object',
  required: ['success', 'message'],
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    details: {},
  },
};

const bearer = [{ bearerAuth: [] }];

export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShareWork Backend API',
    version: '0.1.0',
    description:
      'Current ShareWork REST API. Success bodies use { success, ...payload }. Errors use { success: false, message } plus HTTP status. See docs/frontend-integration.md for frontend contract mappings.',
  },
  servers: [{ url: 'http://localhost:5000', description: 'Local development' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Discovery' },
    { name: 'Gigs' },
    { name: 'Provider' },
    { name: 'Conversations' },
    { name: 'Projects' },
    { name: 'Files' },
    { name: 'Payments' },
    { name: 'Requirements' },
    { name: 'Categories' },
    { name: 'Notifications' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorShape,
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'provider', 'admin'] },
          avatar: { type: 'string' },
          isVerified: { type: 'boolean' },
          isOnline: { type: 'boolean' },
          lastSeen: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Requirement: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customerId: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          budget: { type: 'number' },
          deadline: { type: 'string', format: 'date-time' },
          skills: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['open', 'closed', 'cancelled'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      BadRequest: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Authentication required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden: { description: 'Role or ownership denied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness',
        responses: { 200: { description: '{ ok, time, db, success, message }' } },
      },
    },
    '/openapi.json': {
      get: {
        tags: ['Health'],
        summary: 'OpenAPI document',
        responses: { 200: { description: 'OpenAPI 3 JSON' } },
      },
    },
    '/api-docs': {
      get: {
        tags: ['Health'],
        summary: 'Browsable API documentation',
        responses: { 200: { description: 'HTML documentation' } },
      },
    },
    '/api/files/{id}': {
      get: {
        tags: ['Files'],
        summary: 'Download a stored file. Portfolio is public. Deliverables and chat attachments require a project/conversation participant JWT.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'File bytes' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Public signup for customer or provider',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'phone', 'password', 'role'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['customer', 'provider'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, user, requiresVerification, message, retryAfterSeconds }' },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { description: 'Email or phone already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email, password, and role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'role'],
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string', enum: ['customer', 'provider', 'admin'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, user, token, refreshToken } or { success, user, requiresVerification, message, retryAfterSeconds } or admin { success, user, requiresOtp, message, retryAfterSeconds }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email OTP and issue tokens. Verified admin login OTP also issues tokens here.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: { email: { type: 'string' }, otp: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, verified, user, token, refreshToken }' },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/resend-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Resend a verification or password-reset OTP. Works after expiry. Does not require the previous OTP.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'purpose'],
                properties: {
                  email: { type: 'string' },
                  purpose: { type: 'string', enum: ['verify', 'reset'] },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, message, retryAfterSeconds }' },
          400: { $ref: '#/components/responses/BadRequest' },
          429: { description: 'Cooldown or resend limit reached' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset OTP. Always returns a generic message.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['email'], properties: { email: { type: 'string' } } },
            },
          },
        },
        responses: { 200: { description: '{ success, message }' } },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Complete password reset with email, OTP, and new password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp', 'newPassword'],
                properties: {
                  email: { type: 'string' },
                  otp: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, message }' },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Issue new access and refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: { refreshToken: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, user, token, refreshToken }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Current authenticated user and profile',
        security: bearer,
        responses: {
          200: { description: '{ success, user, profile }. Customer profile includes country when set.' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update own name, avatar, bio, and customer country',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  avatar: { type: 'string' },
                  bio: { type: 'string' },
                  country: { type: 'string', description: 'Customer profiles only' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, user, profile }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/{id}/profile': {
      get: {
        tags: ['Users'],
        summary: 'Public profile',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, user, profile, rating, gigs }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/customers/discover': {
      get: {
        tags: ['Discovery'],
        summary: 'Discover providers. Customer only.',
        security: bearer,
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'budgetMin', in: 'query', schema: { type: 'number' } },
          { name: 'budgetMax', in: 'query', schema: { type: 'number' } },
          { name: 'rating', in: 'query', schema: { type: 'number' } },
          { name: 'online', in: 'query', schema: { type: 'string', enum: ['online', 'offline', 'busy'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          200: { description: '{ success, providers, total, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/providers/{id}/gigs': {
      get: {
        tags: ['Discovery'],
        summary: 'List a provider gigs',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, gigs }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/provider/dashboard/stats': {
      get: {
        tags: ['Provider'],
        summary: 'Provider dashboard stats',
        security: bearer,
        responses: {
          200: { description: '{ success, stats }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/provider/earnings': {
      get: {
        tags: ['Provider'],
        summary: 'Provider earnings transactions',
        security: bearer,
        responses: {
          200: { description: '{ success } plus earnings payload' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/provider/availability': {
      post: {
        tags: ['Provider'],
        summary: 'Update provider availability',
        security: bearer,
        responses: {
          200: { description: '{ success, profile }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/provider/availability/toggle-online': {
      put: {
        tags: ['Provider'],
        summary: 'Toggle provider online status',
        security: bearer,
        responses: {
          200: { description: '{ success, profile }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/provider/withdraw': {
      post: {
        tags: ['Provider'],
        summary: 'Create a withdrawal request record. No bank payout.',
        security: bearer,
        responses: {
          200: { description: '{ success, transaction }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/gigs': {
      post: {
        tags: ['Gigs'],
        summary: 'Create gig. Provider only. Multipart supported for portfolio.',
        security: bearer,
        responses: {
          201: { description: '{ success, gig }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/gigs/{id}': {
      get: {
        tags: ['Gigs'],
        summary: 'Public gig detail',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, gig }' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Gigs'],
        summary: 'Update own gig. Provider owner only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, gig }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/conversations': {
      get: {
        tags: ['Conversations'],
        summary: 'List conversations for the authenticated participant',
        security: bearer,
        responses: {
          200: { description: '{ success, conversations }. unreadCount is a map keyed by user id.' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Conversations'],
        summary: 'Start a conversation. Customer only.',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['providerId'],
                properties: { providerId: { type: 'string' }, gigId: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, conversation }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/conversations/{id}/messages': {
      get: {
        tags: ['Conversations'],
        summary: 'List messages. Participant only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, messages }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Conversations'],
        summary: 'Send a text or file message. Participant only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  type: { type: 'string', enum: ['text'] },
                  content: { type: 'string' },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['content', 'file'],
                properties: {
                  type: { type: 'string', enum: ['file'] },
                  content: { type: 'string' },
                  file: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, message }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/conversations/{id}/agreement': {
      post: {
        tags: ['Conversations'],
        summary: 'Create agreement. Provider only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          201: { description: '{ success, message }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/conversations/{id}/agreement/{agreementId}/approve': {
      post: {
        tags: ['Conversations'],
        summary: 'Approve agreement and create project. Customer only.',
        security: bearer,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'agreementId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: '{ success, message, project }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/conversations/{id}/agreement/{agreementId}/reject': {
      post: {
        tags: ['Conversations'],
        summary: 'Reject agreement. Customer only.',
        security: bearer,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'agreementId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: '{ success, message }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List own projects. Query role=customer or role=provider scopes by JWT identity.',
        security: bearer,
        parameters: [
          { name: 'role', in: 'query', required: true, schema: { type: 'string', enum: ['customer', 'provider'] } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: '{ success, projects }. Amount is fixedPrice. Provider name is not included; use providerId.' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Project detail. Participant only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, project, review }. review is null until the customer submits one.' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/projects/{id}/fund-escrow': {
      post: {
        tags: ['Projects'],
        summary: 'Create Razorpay order for project escrow. Customer only. Does not lock escrow.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, order }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects/{id}/submit-deliverable': {
      post: {
        tags: ['Projects'],
        summary: 'Submit deliverable files. Provider only. Multipart field files plus message.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['message', 'files'],
                properties: {
                  message: { type: 'string' },
                  files: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ success, project }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects/{id}/approve-deliverable': {
      post: {
        tags: ['Projects'],
        summary: 'Approve deliverable. Customer only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, project }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects/{id}/request-revision': {
      post: {
        tags: ['Projects'],
        summary: 'Request revision. Customer only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, project }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects/{id}/dispute': {
      post: {
        tags: ['Projects'],
        summary: 'Open a dispute. Customer or provider participant only.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reason', 'description'],
                properties: {
                  reason: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, dispute, project }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/projects/{id}/review': {
      post: {
        tags: ['Projects'],
        summary: 'Review a completed project. Customer owner only. One review per project.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, review }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/payments/create-order': {
      post: {
        tags: ['Payments'],
        summary: 'Create Razorpay order. Customer only.',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['projectId'], properties: { projectId: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: '{ success, order }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/payments/verify': {
      post: {
        tags: ['Payments'],
        summary: 'Razorpay webhook. Raw body + HMAC. No JWT. Locks escrow after captured payment.',
        responses: {
          200: { description: 'Acknowledged' },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/transactions/me': {
      get: {
        tags: ['Payments'],
        summary: 'Own payment/escrow transactions. No projectTitle or providerName; join via projectId.',
        security: bearer,
        responses: {
          200: { description: '{ success, transactions }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/escrow/release': {
      post: {
        tags: ['Payments'],
        summary: 'Release locked escrow. Customer only. Project must be delivered.',
        security: bearer,
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', required: ['projectId'], properties: { projectId: { type: 'string' } } },
            },
          },
        },
        responses: {
          200: { description: '{ success, project }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/customer/requirements': {
      post: {
        tags: ['Requirements'],
        summary: 'Create a customer requirement. Ownership from JWT, not body.',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'category', 'budget', 'deadline', 'skills'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  budget: { type: 'number' },
                  deadline: { type: 'string', format: 'date-time' },
                  skills: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: '{ success, requirement }. status is set to open.' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      get: {
        tags: ['Requirements'],
        summary: 'List the authenticated customer own requirements',
        security: bearer,
        responses: {
          200: { description: '{ success, requirements }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List active categories from the database. Public.',
        responses: {
          200: { description: '{ success, categories: [{ id, name, slug, isActive, isSystem }] }' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Admin stats',
        security: bearer,
        responses: {
          200: { description: '{ success, stats }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users. Optional role=customer|provider, q, isBanned, page.',
        security: bearer,
        parameters: [
          { name: 'role', in: 'query', required: false, schema: { type: 'string', enum: ['customer', 'provider'] } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'isBanned', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: '{ success, users, total, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/projects': {
      get: {
        tags: ['Admin'],
        summary: 'List all projects',
        security: bearer,
        responses: {
          200: { description: '{ success, projects }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/escrows': {
      get: {
        tags: ['Admin'],
        summary: 'List escrows',
        security: bearer,
        responses: {
          200: { description: '{ success, escrows }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/leakage-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List leakage logs without raw content',
        security: bearer,
        responses: {
          200: { description: '{ success, logs }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/disputes': {
      get: {
        tags: ['Admin'],
        summary: 'List disputes',
        security: bearer,
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'in_review', 'resolved'] } }],
        responses: {
          200: { description: '{ success, disputes }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/settings': {
      get: {
        tags: ['Admin'],
        summary: 'Get platform settings',
        security: bearer,
        responses: {
          200: { description: '{ success, settings }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      put: {
        tags: ['Admin'],
        summary: 'Update platform fee/gst/maintenance',
        security: bearer,
        responses: {
          200: { description: '{ success, settings }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/disputes/{id}/resolve': {
      post: {
        tags: ['Admin'],
        summary: 'Resolve dispute. refund=true refunds locked escrow once. split=true applies a 50/50 split once. Cannot combine refund and split.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, dispute }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users/{id}/ban': {
      put: {
        tags: ['Admin'],
        summary: 'Ban or unban a user',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, user }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Admin user detail with profile, gigs, and projects',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, user, profile, gigs, projects }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/admin/projects/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Admin project detail with escrow, transactions, and disputes',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, project, escrow, transactions, disputes }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/projects/{id}/force-release': {
      post: {
        tags: ['Admin'],
        summary: 'Admin force-release of locked escrow. Idempotent if already released.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, escrow, project, alreadyProcessed, net }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/transactions': {
      get: {
        tags: ['Admin'],
        summary: 'List transactions with type/status filters and pagination',
        security: bearer,
        responses: {
          200: { description: '{ success, transactions, total, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/withdrawals': {
      get: {
        tags: ['Admin'],
        summary: 'List provider withdrawal records. Status is the stored transaction status; no payout processor.',
        security: bearer,
        responses: {
          200: { description: '{ success, withdrawals, total, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/categories': {
      get: {
        tags: ['Admin'],
        summary: 'List persisted categories including inactive',
        security: bearer,
        responses: {
          200: { description: '{ success, categories }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a category',
        security: bearer,
        responses: {
          201: { description: '{ success, category }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { description: 'Duplicate category' },
        },
      },
    },
    '/api/admin/categories/{id}': {
      put: {
        tags: ['Admin'],
        summary: 'Update category name or isActive. System names cannot be renamed.',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, category }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a non-system category that is not referenced',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, deleted }' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/audit-logs': {
      get: {
        tags: ['Admin'],
        summary: 'List admin audit logs',
        security: bearer,
        responses: {
          200: { description: '{ success, logs, total, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List the authenticated user\'s notifications',
        security: bearer,
        responses: {
          200: { description: '{ success, notifications, total, unreadCount, page }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/unread-count': {
      get: {
        tags: ['Notifications'],
        summary: 'Unread notification count for the authenticated user',
        security: bearer,
        responses: {
          200: { description: '{ success, unreadCount }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all of the authenticated user\'s notifications read',
        security: bearer,
        responses: {
          200: { description: '{ success, updated }' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one of the authenticated user\'s notifications read',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: '{ success, notification }' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
};
