import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { User } from '../models/User';
import { ChatSession } from '../models/ChatSession';
import { Message } from '../models/Message';
import { logger } from '../utils/logger';

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to database for seeding');

    // Clear existing data
    await User.deleteMany({});
    await ChatSession.deleteMany({});
    await Message.deleteMany({});

    logger.info('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await User.create({
      email: 'admin@starznexus.com',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      subscription: 'enterprise',
      emailVerified: true,
      settings: {
        theme: 'cosmic',
        notifications: true,
        dataRefresh: 30,
        language: 'en',
      },
      stats: {
        chatSessions: 5,
        messagesSent: 150,
        observations: 20,
        totalTokensUsed: 50000,
      },
      lastLogin: new Date(),
    });

    // Create test user
    const testPassword = await bcrypt.hash('test123', 12);
    const testUser = await User.create({
      email: 'test@starznexus.com',
      username: 'cosmic_explorer',
      password: testPassword,
      role: 'researcher',
      subscription: 'pro',
      emailVerified: true,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cosmic',
      settings: {
        theme: 'cosmic',
        notifications: true,
        dataRefresh: 60,
        language: 'en',
      },
      stats: {
        chatSessions: 3,
        messagesSent: 80,
        observations: 15,
        totalTokensUsed: 25000,
      },
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    });

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 12);
    const regularUser = await User.create({
      email: 'user@starznexus.com',
      username: 'astronomy_fan',
      password: userPassword,
      role: 'user',
      subscription: 'free',
      emailVerified: true,
      settings: {
        theme: 'dark',
        notifications: true,
        dataRefresh: 120,
        language: 'en',
      },
      stats: {
        chatSessions: 1,
        messagesSent: 25,
        observations: 5,
        totalTokensUsed: 8000,
      },
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
    });

    // Create sample chat session for admin
    const adminSession = await ChatSession.create({
      userId: adminUser._id,
      title: 'Understanding Black Holes',
      context: {
        astronomicalFocus: ['blackholes', 'cosmology'],
        lastQuery: 'What happens inside a black hole?',
        expertiseLevel: 'expert',
        temperature: 0.7,
        maxTokens: 2000,
      },
      metadata: {
        messageCount: 8,
        totalTokens: 4500,
        lastActivity: new Date(),
        isArchived: false,
        isPinned: true,
        tags: ['black-holes', 'event-horizon', 'singularity'],
      },
    });

    // Create sample messages for admin session
    await Message.create([
      {
        sessionId: adminSession._id,
        content: 'Can you explain what happens inside a black hole?',
        role: 'user',
        metadata: {
          tokensUsed: 15,
          model: 'user',
        },
      },
      {
        sessionId: adminSession._id,
        content: `A black hole is a region of spacetime where gravity is so strong that nothing, not even light, can escape from it. The boundary beyond which no escape is possible is called the event horizon.

**Key Components:**
1. **Event Horizon** - The point of no return
2. **Singularity** - The infinitely dense core
3. **Ergosphere** - Region outside the event horizon where spacetime is dragged along

**What happens inside:**
- Time dilation becomes extreme
- Spaghettification occurs due to tidal forces
- All matter collapses to the singularity

Current theories suggest information paradox and need for quantum gravity to fully understand the interior.`,
        role: 'assistant',
        metadata: {
          responseTime: 1200,
          tokensUsed: 180,
          model: 'llama3',
          temperature: 0.7,
          confidence: 0.95,
          sources: ['NASA Black Hole Guide', 'Einstein Field Equations'],
        },
      },
      {
        sessionId: adminSession._id,
        content: 'What about Hawking radiation?',
        role: 'user',
        metadata: {
          tokensUsed: 8,
          model: 'user',
        },
      },
      {
        sessionId: adminSession._id,
        content: `**Hawking Radiation** - Theoretical prediction by Stephen Hawking that black holes should emit radiation due to quantum effects near the event horizon.

**Key Points:**
- Virtual particle pairs form near the event horizon
- One particle escapes while its antipartner falls in
- Results in black hole evaporation over astronomical timescales
- Temperature inversely proportional to mass: T ≈ ħc³/(8πGMk)

For a solar-mass black hole, temperature is ~60 nanokelvin, taking ~10⁶⁷ years to evaporate.`,
        role: 'assistant',
        metadata: {
          responseTime: 800,
          tokensUsed: 120,
          model: 'llama3',
          temperature: 0.7,
          confidence: 0.98,
        },
      },
    ]);

    // Create sample chat session for test user
    const testSession = await ChatSession.create({
      userId: testUser._id,
      title: 'Exoplanet Discovery Analysis',
      context: {
        astronomicalFocus: ['exoplanets', 'stars'],
        lastQuery: 'How do we detect exoplanets?',
        expertiseLevel: 'intermediate',
        temperature: 0.6,
        maxTokens: 1500,
      },
      metadata: {
        messageCount: 6,
        totalTokens: 3200,
        lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        isArchived: false,
        isPinned: false,
        tags: ['exoplanets', 'kepler', 'transit-method'],
      },
    });

    // Create welcome session for regular user
    const welcomeSession = await ChatSession.create({
      userId: regularUser._id,
      title: 'Welcome to STARZ NEXUS',
      context: {
        astronomicalFocus: ['astronomy-basics'],
        lastQuery: '',
        expertiseLevel: 'beginner',
        temperature: 0.8,
        maxTokens: 1000,
      },
      metadata: {
        messageCount: 2,
        totalTokens: 500,
        lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        isArchived: false,
        isPinned: true,
        tags: ['welcome', 'getting-started'],
      },
    });

    // Add welcome message
    await Message.create({
      sessionId: welcomeSession._id,
      content: `Welcome to STARZ NEXUS, your cosmic intelligence assistant! 

I'm here to help you explore the universe. You can ask me about:
- Stars, planets, and galaxies
- Black holes and nebulae
- Space missions and discoveries
- Astronomical phenomena
- And much more!

What would you like to learn about today?`,
      role: 'system',
      metadata: {
        tokensUsed: 80,
        model: 'system',
      },
    });

    logger.info('Database seeded successfully');
    logger.info('========================================');
    logger.info('Sample Users Created:');
    logger.info(`Admin: ${adminUser.email} / admin123`);
    logger.info(`Researcher: ${testUser.email} / test123`);
    logger.info(`User: ${regularUser.email} / user123`);
    logger.info('========================================');
    
    // Disconnect from database
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();