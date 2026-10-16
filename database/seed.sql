
-- ============================================================
-- CampusBite Seed Data
-- Run AFTER schema.sql
-- Prices are stored in PAISE (1 INR = 100 paise)
-- Example: 2500 paise = ₹25.00
-- Existing orders and menu items are preserved.
-- ============================================================

USE campusbite;

INSERT INTO menu_items
(name, description, category, price_paise, image_url, is_available)
SELECT s.name, s.description, s.category, s.price_paise,
       s.image_url, s.is_available
FROM (
    SELECT 'Samosa' AS name,
           'Crispy potato-filled samosa' AS description,
           'Snacks' AS category, 1500 AS price_paise,
           'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop' AS image_url,
           1 AS is_available

    UNION ALL SELECT 'Aloo Patty', 'Potato patty',
           'Snacks', 2500, NULL, 1
    UNION ALL SELECT 'Paneer Patty', 'Paneer-filled patty',
           'Snacks', 3000, NULL, 1

    UNION ALL SELECT 'Aloo Paratha', 'Stuffed potato paratha',
           'Breakfast', 5000, NULL, 1
    UNION ALL SELECT 'Paneer Paratha', 'Stuffed paneer paratha',
           'Breakfast', 7000, NULL, 1
    UNION ALL SELECT 'Poha', 'Poha breakfast',
           'Breakfast', 4000, NULL, 1

    UNION ALL SELECT 'Pav Bhaji', 'Pav served with bhaji',
           'Meals', 8000, NULL, 1
    UNION ALL SELECT 'Chola Bhatura', 'Chole with bhatura',
           'Meals', 9000, NULL, 1
    UNION ALL SELECT 'Rajma Rice', 'Rajma served with rice',
           'Meals', 9000, NULL, 1
    UNION ALL SELECT 'Puri Sabji', 'Puri served with sabji',
           'Meals', 6500, NULL, 1

    UNION ALL SELECT 'Chilli Potato', 'Spicy chilli potato',
           'Snacks', 9000, NULL, 1

    UNION ALL SELECT 'Veg Noodles', 'Vegetable noodles',
           'Noodles', 7000, NULL, 1
    UNION ALL SELECT 'Hakka Noodles', 'Hakka-style noodles',
           'Noodles', 8000, NULL, 1
    UNION ALL SELECT 'Singapuri Noodles', 'Singapore-style noodles',
           'Noodles', 9000, NULL, 1

    UNION ALL SELECT 'Hot Coffee', 'Hot coffee',
           'Beverages', 1500, NULL, 1
    UNION ALL SELECT 'Cold Coffee', 'Chilled coffee',
           'Beverages', 6000, NULL, 1
    UNION ALL SELECT 'Tea', 'Hot tea',
           'Beverages', 1000, NULL, 1

    -- Keep the existing Desserts category and items.
    UNION ALL SELECT 'Gulab Jamun (2 pcs)',
           'Soft milk-solid dumplings soaked in rose-flavoured sugar syrup. Served warm.',
           'Desserts', 3000,
           'https://images.unsplash.com/photo-1576506295286-5cda18df43e7?w=400&auto=format&fit=crop',
           1

    UNION ALL SELECT 'Gajar Halwa',
           'Slow-cooked carrot pudding with ghee, milk, sugar, and cardamom.',
           'Desserts', 3500,
           'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop',
           1

    UNION ALL SELECT 'Chocolate Brownie',
           'Chocolate brownie. Best enjoyed warm.',
           'Desserts', 4000,
           'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&auto=format&fit=crop',
           0
) AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM menu_items AS existing
    WHERE existing.name = s.name
);

-- Verify the menu.
SELECT id, name, category, price_paise, is_available
FROM menu_items
ORDER BY category, name;
