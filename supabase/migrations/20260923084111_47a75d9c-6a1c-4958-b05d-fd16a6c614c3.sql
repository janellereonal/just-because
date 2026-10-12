DELETE FROM public.palettes;

INSERT INTO public.palettes (id, name, group_name, background, primary_color, accent, sort_order) VALUES
 ('22222222-2222-4222-8222-000000000001','Blush','Romantic','#F8E1E7','#E8607A','#C43B5A',1),
 ('22222222-2222-4222-8222-000000000002','Deep Romance','Romantic','#FCE9E4','#D64550','#7A1F2B',2),
 ('22222222-2222-4222-8222-000000000003','Rose Gold','Romantic','#FBEFE9','#D99C8F','#8A5A4E',3),
 ('22222222-2222-4222-8222-000000000004','Blush Bloom','Romantic','#FCF1F0','#E0A9A3','#9C829B',4),
 ('22222222-2222-4222-8222-000000000005','Berry','Romantic','#F7ECF2','#B83B7A','#4A1D3F',5),
 ('22222222-2222-4222-8222-000000000006','Confetti','Bright','#FFF3D6','#FF9F5A','#5A6FE8',6),
 ('22222222-2222-4222-8222-000000000007','Pastel Party','Bright','#FDEFF4','#F7A8C4','#9B72CF',7),
 ('22222222-2222-4222-8222-000000000008','Sunny','Bright','#FFF6E5','#FFC24B','#6BAF92',8),
 ('22222222-2222-4222-8222-000000000009','Citrus','Bright','#FFFBEA','#F7B32B','#E4572E',9),
 ('22222222-2222-4222-8222-000000000010','Peach Fuzz','Bright','#FFF1EA','#FFA886','#C45E4A',10),
 ('22222222-2222-4222-8222-000000000011','Soft Goodbye','Soft','#EEF3F5','#88A9C3','#3D5A73',11),
 ('22222222-2222-4222-8222-000000000012','Sky','Soft','#EEF4FB','#7FA7D9','#2E4A7A',12),
 ('22222222-2222-4222-8222-000000000013','Ocean','Soft','#EAF4F4','#4FA3A5','#1F4E5F',13),
 ('22222222-2222-4222-8222-000000000014','Lavender Paws','Soft','#F3EFFA','#B392D9','#F49AB6',14),
 ('22222222-2222-4222-8222-000000000015','Ivory Sage','Soft','#FAF6F0','#D4B896','#7A8C7A',15),
 ('22222222-2222-4222-8222-000000000016','Just Because','Earthy','#F4EEE3','#B5623E','#2B2522',16),
 ('22222222-2222-4222-8222-000000000017','Golden Hour','Earthy','#FFF6E9','#F0A868','#5A7D9A',17),
 ('22222222-2222-4222-8222-000000000018','Classic Christmas','Earthy','#F4EDE4','#C1442E','#2F6B4F',18),
 ('22222222-2222-4222-8222-000000000019','Cozy Cabin','Earthy','#FBF3E7','#D98C5F','#7A5230',19),
 ('22222222-2222-4222-8222-000000000020','Timeless','Earthy','#F6EFE9','#C9A26B','#5A4A3F',20),
 ('22222222-2222-4222-8222-000000000021','Matcha','Earthy','#F1F3E8','#8FA876','#3F5A3A',21),
 ('22222222-2222-4222-8222-000000000022','Monochrome','Earthy','#FAFAF7','#2B2522','#8A8177',22),
 ('22222222-2222-4222-8222-000000000023','Midnight Gold','Dark','#1A1F2E','#E8C468','#F5F0E1',23),
 ('22222222-2222-4222-8222-000000000024','Sparkle','Dark','#20143A','#9B6FE8','#E8D9A0',24);

UPDATE public.themes t SET suggested_palette_ids = s.ids
FROM (VALUES
  ('Valentine''s',   ARRAY['Blush','Deep Romance','Berry']),
  ('Happy Birthday', ARRAY['Confetti','Pastel Party','Citrus']),
  ('Despidida',      ARRAY['Golden Hour','Soft Goodbye','Sky']),
  ('Christmas',      ARRAY['Classic Christmas','Cozy Cabin','Midnight Gold']),
  ('Pets',           ARRAY['Sunny','Lavender Paws','Peach Fuzz']),
  ('New Year',       ARRAY['Midnight Gold','Sparkle','Monochrome']),
  ('Anniversary',    ARRAY['Timeless','Rose Gold','Just Because']),
  ('Weddings',       ARRAY['Ivory Sage','Blush Bloom','Matcha'])
) AS v(theme_name, names)
CROSS JOIN LATERAL (
  SELECT array_agg(p.id ORDER BY array_position(v.names, p.name)) AS ids
  FROM public.palettes p WHERE p.name = ANY(v.names)
) s
WHERE t.name = v.theme_name;