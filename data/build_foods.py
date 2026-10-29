"""Builds ui/foods.js from INDB (Indian Nutrient Databank, per 100 g) + basics.csv.
Run once at dev time: python3 data/build_foods.py
Row format: [name, kcal, protein, carb, fat, fibre, veg(1 veg, 2 egg, 0 non-veg), units "name:grams|...", sugar, sodium_mg, iron_mg, calcium_mg, source]
"""
import csv, json, re, os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
NONVEG = re.compile(r"chicken|mutton|lamb|fish|prawn|shrimp|keema|kheema|meat|crab|lobster|beef|pork|\bham\b|bacon|tuna|salmon|machli|machhli|gosht|liver|jhinga|sardine|mackerel|squid|clam|oyster|sausage|turkey|duck|yakhni|rogan josh|tahar|seekh|\bmince", re.I)
EGG = re.compile(r"\begg|omelette|omlet|\bande\b|\banda\b|meringue|souffle|mayonnaise|custard|chiffon", re.I)
BOWLY = re.compile(r"dal\b|dal |curry|sabzi|subzi|rice|pulao|khichdi|khichri|upma|poha|halwa|kheer|raita|sambar|rasam|kadhi|chole|channa|chana|rajma|bhaji|bhurji|daliya|porridge|korma|paneer|kofta|bhartha|saag|palak|aloo|gobhi|bhindi|lauki|ghiya|dum|makhani|soup|salad|chaat|chat|sprout|vegetable|pasta|macaroni|noodle|chowmein|biryani|khichdi|pongal|bisi", re.I)
PLATEY = re.compile(r"rice|pulao|biryani|upma|poha|khichdi|pasta|noodle|chowmein|pongal", re.I)
LIQ = re.compile(r"shake|juice|lassi|sharbat|tea|coffee|chai|smoothie|cooler|punch|water|drink|milk\b|thandai|kanji|buttermilk|chaas", re.I)

def r1(x):
    try:
        x = float(x)
    except Exception:
        return 0
    if x != x:
        return 0
    return round(x, 1)

basic_names = set(r['name'].lower() for r in csv.DictReader(open(os.path.join(HERE, 'basics.csv'))))
rows = []
d = pd.read_excel(os.path.join(HERE, 'INDB.xlsx'))
for _, r in d.iterrows():
    name = re.sub(r"\s+", " ", str(r.food_name).replace("\xa0", " ")).strip()
    name = {'Hot tea (Garam Chai)': 'Hot tea, light milk (Garam Chai)'}.get(name, name)
    kcal = r1(r.energy_kcal)
    if kcal <= 0 or name.lower() in basic_names:
        continue
    low = name.lower()
    # skip pure ingredients/sauces nobody logs as a meal
    if re.search(r"icing|frosting|stock\b|\bdough\b|pastry$|masala$|powder|syrup$|essence", low):
        continue
    veg = 0 if NONVEG.search(name) else (2 if EGG.search(name) and 'eggless' not in low and 'eggplant' not in low else 1)
    units = []
    unit = r.servings_unit if isinstance(r.servings_unit, str) else None
    uk = r.unit_serving_energy_kcal
    if unit and uk == uk and kcal:
        g = round(float(uk) / kcal * 100)
        if 5 <= g <= 600:
            u = unit.strip().lower()
            if u in ('bowl', 'small bowl', 'curry bowl', 'soup bowl'):
                u = 'bowl'
            # INDB serving sizes are often whole-recipe yields; use standard Indian household sizes instead
            FIXED = {'tea cup': 100, 'cup': 150, 'glass': 200, 'tall glass': 300, 'bowl': 200, 'tablespoon': 15, 'teaspoon': 5, 'jar': 0, 'dish': 0, 'souffle dish': 0}
            if u in FIXED:
                g = FIXED[u]
            if u == 'plate':
                g = min(g, 350)
            if g:
                units.append(f"{u}:{g}")
    if LIQ.search(name) and not BOWLY.search(name):
        hot = re.search(r'tea|chai|coffee|kehwa|chocolate', name, re.I)
        units.insert(0, 'tea cup:100' if hot else 'glass:200')
        units.append('cup:150')
    elif BOWLY.search(name):
        units.insert(0, 'katori:150')
        if PLATEY.search(name):
            units.append('plate:250')
    units.append('tablespoon:15')
    seen, uu = set(), []
    for u in units:
        k = u.split(':')[0]
        if k not in seen:
            seen.add(k); uu.append(u)
    rows.append([name, kcal, r1(r.protein_g), r1(r.carb_g), r1(r.fat_g), r1(r.fibre_g), veg, '|'.join(uu),
                 r1(r.freesugar_g), r1(r.sodium_mg), r1(r.iron_mg), r1(r.calcium_mg), 'INDB'])

with open(os.path.join(HERE, 'basics.csv')) as f:
    for b in csv.DictReader(f):
        rows.append([b['name'], r1(b['kcal']), r1(b['protein']), r1(b['carb']), r1(b['fat']), r1(b['fibre']), int(b['veg']),
                     b['units'] + '|tablespoon:15', 0, 0, 0, 0, 'Basic'])

# basics first so common items rank above recipe variants with the same score
rows.sort(key=lambda x: 0 if x[12] == 'Basic' else 1)
out = 'window.FOODS=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, '..', 'ui', 'foods.js'), 'w').write(out)
print(len(rows), 'foods,', sum(1 for x in rows if x[6] == 1), 'veg,', round(len(out) / 1024), 'KB')
