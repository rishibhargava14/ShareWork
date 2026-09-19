import mongoose from 'mongoose';
import AdminUser from '../../src/models/AdminUser.js';
import Conversation from '../../src/models/Conversation.js';
import CustomerProfile from '../../src/models/CustomerProfile.js';
import Dispute from '../../src/models/Dispute.js';
import Escrow from '../../src/models/Escrow.js';
import Gig from '../../src/models/Gig.js';
import LeakageLog from '../../src/models/LeakageLog.js';
import Message from '../../src/models/Message.js';
import Notification from '../../src/models/Notification.js';
import PlatformSettings from '../../src/models/PlatformSettings.js';
import Project from '../../src/models/Project.js';
import ProviderProfile from '../../src/models/ProviderProfile.js';
import Requirement from '../../src/models/Requirement.js';
import Review from '../../src/models/Review.js';
import Transaction from '../../src/models/Transaction.js';
import User from '../../src/models/User.js';
import { GIG_PACKAGE_TIERS } from '../../src/constants/gigPackages.js';

const id = () => new mongoose.Types.ObjectId();

const results = [];

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const hasError = (doc, path) => Boolean(doc.validateSync()?.errors?.[path]);

const validPackages = () => [
  {
    name: 'Basic',
    description: 'Basic package for a landing page',
    fixedPrice: GIG_PACKAGE_TIERS.Basic,
    deliveryDays: 3,
    revisions: 1,
    features: ['1 page'],
  },
  {
    name: 'Standard',
    description: 'Standard package for a small site',
    fixedPrice: GIG_PACKAGE_TIERS.Standard,
    deliveryDays: 7,
    revisions: 2,
    features: ['5 pages'],
  },
  {
    name: 'Premium',
    description: 'Premium package for a full product',
    fixedPrice: GIG_PACKAGE_TIERS.Premium,
    deliveryDays: 14,
    revisions: 4,
    features: ['Unlimited pages'],
  },
];

const validUser = (overrides = {}) =>
  new User({
    name: 'Ada Lovelace',
    email: 'Ada@Example.com',
    phone: '+919876543210',
    passwordHash: 'hashed-password',
    role: 'customer',
    ...overrides,
  });

const validGig = (overrides = {}) =>
  new Gig({
    providerId: id(),
    title: 'UI design for a SaaS dashboard',
    category: 'UI/UX',
    description: 'Complete dashboard design with components and states.',
    packages: validPackages(),
    ...overrides,
  });

const validProject = (overrides = {}) =>
  new Project({
    customerId: id(),
    providerId: id(),
    conversationId: id(),
    title: 'Dashboard redesign',
    scope: 'Redesign the main analytics dashboard',
    deliverables: ['Figma file'],
    fixedPrice: 15000,
    timelineDays: 10,
    deadline: new Date('2026-10-01'),
    ...overrides,
  });

const indexKeys = (Model) => Model.schema.indexes().map((entry) => JSON.stringify(entry[0]));

const hasIndex = (Model, keys) => indexKeys(Model).includes(JSON.stringify(keys));

record('exactly 16 requested models loaded', [
  User,
  CustomerProfile,
  ProviderProfile,
  Gig,
  Conversation,
  Message,
  Project,
  Transaction,
  Escrow,
  Review,
  Notification,
  Dispute,
  AdminUser,
  LeakageLog,
  Requirement,
  PlatformSettings,
].length === 16);

const user = validUser();
record('User valid document instantiates', !user.validateSync());
record('User email is normalized to lowercase', user.email === 'ada@example.com');
record('User invalid role fails', hasError(validUser({ role: 'superadmin' }), 'role'));
record('User missing email fails', hasError(validUser({ email: undefined }), 'email'));
record('User passwordHash hidden in JSON', !Object.hasOwn(user.toJSON(), 'passwordHash'));
record('User role index declared', hasIndex(User, { role: 1 }));

const customer = new CustomerProfile({ userId: id(), bio: 'Need a designer' });
record('CustomerProfile valid document instantiates', !customer.validateSync());
record('CustomerProfile missing userId fails', hasError(new CustomerProfile({ bio: 'x' }), 'userId'));

const provider = new ProviderProfile({
  userId: id(),
  title: 'Senior UI/UX Designer',
  categories: ['UI/UX'],
  startingPrice: 5000,
  rating: 4.5,
});
record('ProviderProfile valid document instantiates', !provider.validateSync());
record('ProviderProfile custom category instantiates', !new ProviderProfile({
  userId: id(),
  title: 'Designer',
  categories: ['Brand Ops'],
  startingPrice: 5000,
}).validateSync());
record('ProviderProfile missing categories fails', hasError(new ProviderProfile({
  userId: id(),
  title: 'Designer',
  startingPrice: 5000,
}), 'categories'));
record(
  'ProviderProfile rating above 5 fails',
  hasError(new ProviderProfile({
    userId: id(),
    title: 'Designer',
    categories: ['Web'],
    startingPrice: 5000,
    rating: 6,
  }), 'rating'),
);
record(
  'ProviderProfile rating below 0 fails',
  hasError(new ProviderProfile({
    userId: id(),
    title: 'Designer',
    categories: ['Web'],
    startingPrice: 5000,
    rating: -1,
  }), 'rating'),
);
record('ProviderProfile categories+rating index declared', hasIndex(ProviderProfile, { categories: 1, rating: -1 }));

const gig = validGig();
record('Gig valid document instantiates', !gig.validateSync());
record('Gig requires exactly 3 packages', hasError(validGig({ packages: validPackages().slice(0, 2) }), 'packages'));
record(
  'Gig rejects mismatched package price',
  hasError(validGig({
    packages: validPackages().map((item, index) => (
      index === 0 ? { ...item, fixedPrice: 15000 } : item
    )),
  }), 'packages'),
);
record('Gig custom category instantiates', !validGig({ category: 'Brand Ops' }).validateSync());
record('Gig missing category fails', hasError(validGig({ category: undefined }), 'category'));
record('Gig text index declared', hasIndex(Gig, { title: 'text', description: 'text' }));
record('Gig providerId index declared', hasIndex(Gig, { providerId: 1 }));
record('Gig isActive index declared', hasIndex(Gig, { isActive: 1 }));

const conversation = new Conversation({
  participants: [id(), id()],
  gigId: id(),
  escrowStatus: 'pending',
});
record('Conversation valid document instantiates', !conversation.validateSync());
record(
  'Conversation invalid escrowStatus fails',
  hasError(new Conversation({ participants: [id()], escrowStatus: 'refunded' }), 'escrowStatus'),
);
record('Conversation participants index declared', hasIndex(Conversation, { participants: 1 }));

const message = new Message({
  conversationId: id(),
  senderId: id(),
  type: 'text',
  content: 'Hello',
});
record('Message valid document instantiates', !message.validateSync());
record(
  'Message invalid type fails',
  hasError(new Message({
    conversationId: id(),
    senderId: id(),
    type: 'voice',
    content: 'Hello',
  }), 'type'),
);
record(
  'Message missing conversationId fails',
  hasError(new Message({ senderId: id(), content: 'Hello' }), 'conversationId'),
);
record(
  'Message agreement status validation works',
  hasError(new Message({
    conversationId: id(),
    senderId: id(),
    type: 'system_agreement',
    content: 'Agreement created',
    agreementData: { title: 'Work', status: 'done' },
  }), 'agreementData.status'),
);
record('Message conversationId+createdAt index declared', hasIndex(Message, { conversationId: 1, createdAt: 1 }));

const project = validProject();
record('Project valid document instantiates', !project.validateSync());
record('Project invalid status fails', hasError(validProject({ status: 'archived' }), 'status'));
record('Project missing customerId fails', hasError(validProject({ customerId: undefined }), 'customerId'));
record('Project customerId index declared', hasIndex(Project, { customerId: 1 }));
record('Project providerId index declared', hasIndex(Project, { providerId: 1 }));
record('Project status index declared', hasIndex(Project, { status: 1 }));
record('Project deadline index declared', hasIndex(Project, { deadline: 1 }));

const transaction = new Transaction({
  projectId: id(),
  userId: id(),
  type: 'escrow_fund',
  amount: 15000,
  netAmount: 15000,
});
record('Transaction valid document instantiates', !transaction.validateSync());
record(
  'Transaction invalid type fails',
  hasError(new Transaction({
    projectId: id(),
    userId: id(),
    type: 'bonus',
    amount: 100,
    netAmount: 100,
  }), 'type'),
);
record(
  'escrow_fund without projectId fails',
  hasError(new Transaction({
    userId: id(),
    type: 'escrow_fund',
    amount: 15000,
    netAmount: 15000,
  }), 'projectId'),
);
record(
  'withdrawal without projectId is valid',
  !new Transaction({
    userId: id(),
    type: 'withdrawal',
    amount: 5000,
    netAmount: 5000,
    upiId: 'provider@oksbi',
  }).validateSync(),
);
record(
  'escrow_release without projectId fails',
  hasError(new Transaction({
    userId: id(),
    type: 'escrow_release',
    amount: 15000,
    netAmount: 13230,
  }), 'projectId'),
);
record(
  'fee without projectId fails',
  hasError(new Transaction({
    userId: id(),
    type: 'fee',
    amount: 1500,
    netAmount: 1500,
  }), 'projectId'),
);
record(
  'gst without projectId fails',
  hasError(new Transaction({
    userId: id(),
    type: 'gst',
    amount: 270,
    netAmount: 270,
  }), 'projectId'),
);
record(
  'refund without projectId fails',
  hasError(new Transaction({
    userId: id(),
    type: 'refund',
    amount: 15000,
    netAmount: 15000,
  }), 'projectId'),
);

const escrow = new Escrow({
  projectId: id(),
  customerId: id(),
  providerId: id(),
  amount: 15000,
  status: 'locked',
});
record('Escrow valid document instantiates', !escrow.validateSync());
record(
  'Escrow invalid status fails',
  hasError(new Escrow({
    projectId: id(),
    customerId: id(),
    providerId: id(),
    amount: 15000,
    status: 'pending',
  }), 'status'),
);

const review = new Review({
  projectId: id(),
  customerId: id(),
  providerId: id(),
  rating: 5,
  comment: 'Great work',
});
record('Review valid document instantiates', !review.validateSync());
record(
  'Review rating 0 fails',
  hasError(new Review({
    projectId: id(),
    customerId: id(),
    providerId: id(),
    rating: 0,
  }), 'rating'),
);
record(
  'Review rating 6 fails',
  hasError(new Review({
    projectId: id(),
    customerId: id(),
    providerId: id(),
    rating: 6,
  }), 'rating'),
);

const notification = new Notification({
  userId: id(),
  type: 'message',
  title: 'New message',
  message: 'You have a new message',
});
record('Notification valid document instantiates', !notification.validateSync());
record(
  'Notification invalid type fails',
  hasError(new Notification({ userId: id(), type: 'sms' }), 'type'),
);

const dispute = new Dispute({
  projectId: id(),
  raisedBy: id(),
  reason: 'Missed deadline',
  description: 'Deliverable was not submitted on time',
});
record('Dispute valid document instantiates', !dispute.validateSync());
record(
  'Dispute invalid status fails',
  hasError(new Dispute({
    projectId: id(),
    raisedBy: id(),
    reason: 'Quality',
    description: 'Below agreed quality',
    status: 'closed',
  }), 'status'),
);

const adminUser = new AdminUser({ userId: id() });
record('AdminUser valid document instantiates', !adminUser.validateSync());
record('AdminUser missing userId fails', hasError(new AdminUser({}), 'userId'));

const leakageLog = new LeakageLog({
  conversationId: id(),
  senderId: id(),
  detectedType: 'phone',
  maskedContent: '**********',
  action: 'blocked',
});
record('LeakageLog valid document instantiates', !leakageLog.validateSync());
record(
  'LeakageLog invalid detectedType fails',
  hasError(new LeakageLog({
    conversationId: id(),
    detectedType: 'whatsapp',
  }), 'detectedType'),
);
record('LeakageLog conversation+createdAt index declared', hasIndex(LeakageLog, { conversationId: 1, createdAt: -1 }));

const settings = new PlatformSettings();
record(
  'PlatformSettings defaults match HTML schema',
  !settings.validateSync() &&
    settings.feePercent === 10 &&
    settings.gstPercent === 18 &&
    settings.maintenance === false &&
    JSON.stringify(settings.fixedPackages) === JSON.stringify([5000, 15000, 35000]),
);

const requirement = new Requirement({
  customerId: id(),
  title: 'Need a landing page',
  description: 'Marketing site with a contact form',
  category: 'Web',
  budget: 15000,
  deadline: new Date('2026-12-01'),
  skills: ['React'],
});
record('Requirement valid document instantiates', !requirement.validateSync());
record(
  'Requirement custom category instantiates',
  !new Requirement({
    customerId: id(),
    title: 'Need a landing page',
    description: 'Marketing site with a contact form',
    category: 'Brand Ops',
    budget: 15000,
    deadline: new Date('2026-12-01'),
    skills: ['React'],
  }).validateSync(),
);
record(
  'Requirement missing category fails',
  hasError(new Requirement({
    customerId: id(),
    title: 'Need a landing page',
    description: 'Marketing site with a contact form',
    budget: 15000,
    deadline: new Date('2026-12-01'),
    skills: ['React'],
  }), 'category'),
);
record('Requirement missing customerId fails', hasError(new Requirement({
  title: 'Need a landing page',
  description: 'Marketing site with a contact form',
  category: 'Web',
  budget: 15000,
  deadline: new Date('2026-12-01'),
  skills: ['React'],
}), 'customerId'));
record('Requirement customerId+createdAt index declared', hasIndex(Requirement, { customerId: 1, createdAt: -1 }));

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

if (failed.length > 0) {
  process.exit(1);
}
