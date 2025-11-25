const { db } = require('./firebase-admin');

async function seedCourses() {
  try {
    console.log('🌱 Seeding sample courses...');

    // Sample institutions (you should have these in your users collection)
    const institutions = [
      { id: 'limkokwing', name: 'Limkokwing University', email: 'info@limkokwing.edu.ls' },
      { id: 'nul', name: 'National University of Lesotho', email: 'admissions@nul.ls' },
      { id: 'botho', name: 'Botho University', email: 'info@bothocollege.ac.ls' }
    ];

    // Sample faculties
    const faculties = [
      { id: 'fac1', name: 'Faculty of Information Technology', institutionId: 'limkokwing' },
      { id: 'fac2', name: 'Faculty of Business', institutionId: 'limkokwing' },
      { id: 'fac3', name: 'Faculty of Engineering', institutionId: 'nul' },
      { id: 'fac4', name: 'Faculty of Health Sciences', institutionId: 'botho' }
    ];

    // Sample courses
    const courses = [
      {
        id: 'course1',
        name: 'Bachelor of Science in Computer Science',
        description: 'Comprehensive computer science program covering programming, algorithms, and software development.',
        duration: '4 years',
        requirements: ['Mathematics B', 'English C', 'Science C'],
        fees: 'M45,000 per year',
        facultyId: 'fac1',
        institutionId: 'limkokwing',
        isActive: true
      },
      {
        id: 'course2',
        name: 'Bachelor of Business Administration',
        description: 'Business management and administration degree focusing on leadership and entrepreneurship.',
        duration: '3 years',
        requirements: ['Mathematics D', 'English C', 'Commerce C'],
        fees: 'M35,000 per year',
        facultyId: 'fac2',
        institutionId: 'limkokwing',
        isActive: true
      },
      {
        id: 'course3',
        name: 'Bachelor of Software Engineering',
        description: 'Software engineering program with focus on modern development practices and technologies.',
        duration: '4 years',
        requirements: ['Mathematics B', 'English C', 'Physics C'],
        fees: 'M40,000 per year',
        facultyId: 'fac1',
        institutionId: 'limkokwing',
        isActive: true
      },
      {
        id: 'course4',
        name: 'Bachelor of Civil Engineering',
        description: 'Civil engineering program covering infrastructure design and construction.',
        duration: '5 years',
        requirements: ['Mathematics A', 'English C', 'Physics B', 'Chemistry C'],
        fees: 'M50,000 per year',
        facultyId: 'fac3',
        institutionId: 'nul',
        isActive: true
      },
      {
        id: 'course5',
        name: 'Bachelor of Nursing',
        description: 'Nursing program preparing students for healthcare careers.',
        duration: '4 years',
        requirements: ['Biology B', 'English C', 'Chemistry C'],
        fees: 'M38,000 per year',
        facultyId: 'fac4',
        institutionId: 'botho',
        isActive: true
      }
    ];

    // Add institutions to users collection
    for (const institution of institutions) {
      await db.collection('users').doc(institution.id).set({
        uid: institution.id,
        email: institution.email,
        userType: 'institution',
        institutionName: institution.name,
        displayName: institution.name,
        createdAt: new Date(),
        status: 'active',
        isVerified: true
      });
      console.log(`✅ Added institution: ${institution.name}`);
    }

    // Add faculties
    for (const faculty of faculties) {
      await db.collection('faculties').doc(faculty.id).set({
        ...faculty,
        createdAt: new Date()
      });
      console.log(`✅ Added faculty: ${faculty.name}`);
    }

    // Add courses
    for (const course of courses) {
      await db.collection('courses').doc(course.id).set({
        ...course,
        createdAt: new Date()
      });
      console.log(`✅ Added course: ${course.name}`);
    }

    console.log('🎉 Sample data seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

seedCourses();