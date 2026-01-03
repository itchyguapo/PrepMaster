import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function syncAdminUser() {
  try {
    const adminEmail = 'schools.medley@gmail.com';
    
    // Check if admin user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    
    if (existingUser.length === 0) {
      // Create admin user
      const [newUser] = await db
        .insert(users)
        .values({
          email: adminEmail,
          role: 'admin',
          supabaseId: adminEmail, // Use email as supabaseId for simplicity
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      console.log('✅ Admin user created:', newUser);
    } else {
      console.log('✅ Admin user already exists:', existingUser[0]);
    }
  } catch (error) {
    console.error('❌ Error syncing admin user:', error);
  } finally {
    process.exit(0);
  }
}

syncAdminUser();
