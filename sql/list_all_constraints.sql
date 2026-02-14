-- =========================================
-- LISTAR TODAS LAS CONSTRAINTS
-- =========================================

-- Ver todas las constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
SELECT 
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  CASE 
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.table_name
    ELSE NULL
  END AS foreign_table_name,
  CASE 
    WHEN tc.constraint_type = 'FOREIGN KEY' THEN ccu.column_name
    ELSE NULL
  END AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =========================================
-- VER CHECK CONSTRAINTS CON SU DEFINICIÓN
-- =========================================

SELECT 
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
