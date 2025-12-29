const { AppDataSource } = require('./dist/datasource');
const { User, UserRole } = require('./dist/users/entities/user.entity');

async function updateSuperAdminPassword() {
  try {
    await AppDataSource.initialize();
    const userRepository = AppDataSource.getRepository(User);

    const superAdmin = await userRepository.findOne({
      where: { username: 'superadmin' }
    });

    if (!superAdmin) {
      console.log('Superadmin not found');
      return;
    }

    superAdmin.password = '$2b$10$TqSM4BD9z3XSSOycRrNkpOj7QvqWm2ZNlbD3gyw733DSfSUCyZ3lO';
    await userRepository.save(superAdmin);
    console.log('Superadmin password updated');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

updateSuperAdminPassword();