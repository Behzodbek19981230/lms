import { AppDataSource } from './src/datasource';
import { User, UserRole } from './src/users/entities/user.entity';

async function createSuperAdmin() {
  try {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);

    // Check if superadmin already exists
    const existingSuperAdmin = await userRepository.findOne({
      where: { role: UserRole.SUPERADMIN },
    });

    if (existingSuperAdmin) {
      console.log('Superadmin already exists:', existingSuperAdmin.username);
      return;
    }

    // Create superadmin user
    const superAdmin = userRepository.create({
      username: 'superadmin',
      password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: password
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPERADMIN,
      phone: '+998901234567',
    });

    await userRepository.save(superAdmin);
    console.log('Superadmin created successfully:', superAdmin.username);
  } catch (error) {
    console.error('Error creating superadmin:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

createSuperAdmin();
