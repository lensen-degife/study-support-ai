INSERT INTO users (id, email, hashed_password, name, role)
VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'jordan.lee@university.edu',
    '$2b$10$DR3Z5/jiUo666wNlyXGTDeugb9DPqaO2.YSbxib009fX6pEm/BORC',
    'Jordan Lee',
    'student'
),
(
    '00000000-0000-0000-0000-000000000002',
    'alex.kim@university.edu',
    '$2b$10$DR3Z5/jiUo666wNlyXGTDeugb9DPqaO2.YSbxib009fX6pEm/BORC',
    'Alex Kim',
    'student'
),
(
    '00000000-0000-0000-0000-000000000003',
    'tutor@university.edu',
    '$2b$10$DR3Z5/jiUo666wNlyXGTDeugb9DPqaO2.YSbxib009fX6pEm/BORC',
    'Dr. Turing',
    'tutor'
),
(
    '00000000-0000-0000-0000-000000000004',
    'admin@university.edu',
    '$2b$10$DR3Z5/jiUo666wNlyXGTDeugb9DPqaO2.YSbxib009fX6pEm/BORC',
    'Admin User',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO students (id, name, email)
VALUES (
    'STU_101',
    'Alex Kim',
    'alex.kim@university.edu'
),
(
    'PY-2026-01',
    'Jordan Lee',
    'jordan.lee@university.edu'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO materials (
    id,
    section_number,
    title,
    content,
    image_url
)
VALUES
(
    'SEC_PY_01',
    1,
    'Python Lists & Mutability',
    'Lists are ordered, mutable collections.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60'
),
(
    'SEC_PY_02',
    2,
    'Python Tuples & Immutability',
    'Tuples are ordered, immutable collections.',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60'
),
(
    'SEC_PY_03',
    3,
    'Python Dictionaries',
    'Dictionaries store key-value pairs.',
    'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60'
)
ON CONFLICT (id) DO NOTHING;
