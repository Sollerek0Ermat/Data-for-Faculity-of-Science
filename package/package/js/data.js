window.ACADEMIC_TREE = {
  id: "root",
  title: "Faculty Departments",
  subtitle: "Select your department to browse levels and courses",
  children: [
    {
      id: "cs",
      title: "Computer Science",
      subtitle: "Department of Computer Science & AI",
      children: [
        {
          id: "cs-l1",
          title: "Level 1",
          subtitle: "First Year Academic Level",
          children: [
            {
              id: "cs-l1-sem1",
              title: "Semester 1",
              subtitle: "First Term Courses",
              leaves: [
                { title: "Introduction to Computer Science", subtitle: "Course Code: CS101", link: "subjects/cs101.html" },
                { title: "Mathematics 1", subtitle: "Course Code: MTH101", link: "subjects/mth101.html" }
              ]
            },
            {
              id: "cs-l1-sem2",
              title: "Semester 2",
              subtitle: "Second Term Courses",
              leaves: [
                { title: "Object Oriented Programming", subtitle: "Course Code: CS102", link: "subjects/cs102.html" }
              ]
            }
          ]
        },
        {
          id: "cs-l2",
          title: "Level 2",
          subtitle: "Second Year Academic Level",
          children: [
            {
              id: "cs-l2-sem1",
              title: "Semester 1",
              subtitle: "First Term Courses",
              leaves: [
                { title: "Data Structures", subtitle: "Course Code: CS201", link: "subjects/cs201.html" }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "is",
      title: "Information Systems",
      subtitle: "Department of Information Systems",
      children: [
        {
          id: "is-l1",
          title: "Level 1",
          subtitle: "First Year Academic Level",
          leaves: [
            { title: "Management Information Systems", subtitle: "Course Code: IS101", link: "subjects/is101.html" }
          ]
        }
      ]
    }
  ]
};
