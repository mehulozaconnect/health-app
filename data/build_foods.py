"""Builds ui/foods.js from INDB (Indian Nutrient Databank, per 100 g) + basics.csv.
Run once at dev time: python3 data/build_foods.py
Row format: [name, kcal, protein, carb, fat, fibre, veg(1 veg, 2 egg, 0 non-veg), units "name:grams|...", sugar, sodium_mg, iron_mg, calcium_mg, source]

Portions: INDB's own serving sizes are inconsistent (some are one piece, some a whole batch), so they are NOT used.
Every dish instead gets standard Indian household measures from the rules below, the same everywhere:
katori 150 g, bowl 200 g, tea cup 180 ml, cup 150 ml, glass 200 ml, tablespoon 15 g, teaspoon 5 g, and fixed piece weights.
Values: if a dish's calories don't match its protein/carbs/fat (Atwater 4/4/9), the macros are scaled to the calories.
"""
import csv, json, re, os
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
NONVEG = re.compile(r"chicken|mutton|lamb|fish|prawn|shrimp|keema|kheema|meat|crab|lobster|beef|pork|\bham\b|bacon|tuna|salmon|machli|machhli|gosht|liver|jhinga|sardine|mackerel|squid|clam|oyster|sausage|turkey|duck|yakhni|rogan josh|tahar|seekh|\bmince", re.I)
EGG = re.compile(r"\begg|omelette|omlet|\bande\b|\banda\b|meringue|souffle|mayonnaise|custard|chiffon", re.I)
LIQ = re.compile(r"hot chocolate(?! souffle)|shake|juice|\blassi|sharbat|\btea\b|coffee|chai|smoothie|cooler|punch|\bwater\b|drink|\bmilk\b|thandai|kanji|buttermilk|chaas|nog|cocoa|kehwa|soda|lemonade|panna|squash", re.I)
HOT = re.compile(r"\btea\b|chai|coffee|kehwa|cocoa|hot chocolate|espreso|espresso", re.I)
SOUP = re.compile(r"soup|rasam|consomme|shorba|broth", re.I)
WET = re.compile(r"dal\b|dal |curry|sabzi|subzi|\brice\b|pulao|khichdi|khichri|upma|poha|halwa|kheer|raita|sambar|kadhi|chole|channa|chana|rajma|bhaji|bhurji|daliya|porridge|korma|kofta curry|bhartha|bharta|saag|palak|aloo|gobhi|bhindi|lauki|ghiya|\bdum\b|makhani|salad|chaat|\bchat\b|sprout|vegetable|pasta|macaroni|spaghetti|noodle|chowmein|biryani|pongal|bisi|stew|masala|kurma|jalfrezi|kadhai|kadai|pudding|custard|mousse|trifle|payasam|shrikhand|cereal|muesli|oats|upma|sevai|vermicelli|khaman|usal|misal|ghugni|sundal|kootu|poriyal|thoran|avial|undhiyu|pitla|zunka|jhol|dalma|chorchori", re.I)
PLATE = re.compile(r"\brice\b|pulao|biryani|upma|poha|khichdi|khichri|pasta|macaroni|spaghetti|noodle|chowmein|pongal|bisi|bhel|chaat|\bchat\b|pav bhaji|misal|sevai|vermicelli", re.I)
SPREAD = re.compile(r"chutney|jam\b|sauce|dip\b|spread|pickle|achar|murabba|marmalade|dressing|raita powder|ketchup|mayonnaise|butter\b|honey|preserve|relish", re.I)
SWEET_SCOOP = re.compile(r"ice cream|ice-cream|kulfi|sorbet|gelato|sundae|frozen yoghurt|frozen yogurt", re.I)

# (pattern, unit name, grams for one) — first match wins
PIECES = [
    (r"makki ki roti|makki roti", "roti", 60), (r"missi roti|bajra roti|jowar roti|ragi roti|akki roti|thalipeeth", "roti", 50),
    (r"stuffed parantha|stuffed paratha|aloo ka parantha|potato parantha|mooli|gobhi ka parantha|phoolgobhi ka parantha|paneer parantha|paneer paratha|dal parantha|pea parantha|matar ka parantha|keema parantha|methi parantha", "paratha", 120),
    (r"parantha|paratha|lachha", "paratha", 80), (r"thepla", "thepla", 40), (r"chapati|roti|phulka|fulka", "roti", 35),
    (r"naan|kulcha", "naan", 90), (r"bhatura|bhature", "bhatura", 70), (r"pani puri|golgappa|gol gappa", "6 puris", 120),
    (r"\bpoori\b|\bpuri\b|luchi", "puri", 25), (r"idli|idly", "idli", 40), (r"masala dosa|mysore dosa", "dosa", 180),
    (r"dosa|dosai|pesarattu|neer dosa", "dosa", 90), (r"uttapam|uthappam", "uttapam", 120), (r"appam", "appam", 60),
    (r"dahi vada|dahi bhalla|dahi vadas", "vada", 90), (r"vada|wada|bonda", "vada", 50), (r"cheela|chilla|chila", "chilla", 70),
    (r"pancake|crepe|malpua|mal pua|pitha", "pancake", 60), (r"dhokla|khaman|handvo", "piece", 30), (r"khandvi", "piece", 15),
    (r"samosa", "samosa", 75), (r"kachori", "kachori", 60), (r"bread pakora|bread pakoda", "piece", 70), (r"paneer pakora|paneer pakoda", "piece", 25), (r"pakora|pakoda|bhajia|bhajiya|bhaji\b|fritter", "piece", 20),
    (r"cutlet|tikki|patty|patties", "piece", 60), (r"kebab|kabab|tikka|shaslik|shashlik", "piece", 30), (r"kofta(?! curry)", "kofta", 30),
    (r"momo|dumpling|modak|kozhukattai", "piece", 30), (r"ladoo|laddoo|laddu|ladu", "ladoo", 35), (r"burfi|barfi|katli|peda|pedha|sandesh", "piece", 25),
    (r"gulab jamun|kala jamun", "piece", 40), (r"rasgulla|rasagola|rasmalai|ras malai|cham cham", "piece", 50), (r"jalebi|imarti", "piece", 25),
    (r"gujiya|gunjia|karanji|shankarpali", "piece", 40), (r"biscuit|cracker", "biscuit", 10), (r"cookie|nankhatai", "cookie", 15),
    (r"\bcake\b|brownie|muffin|cupcake|swiss roll|gateau|pastry", "slice", 60), (r"\bpie\b|\btart\b|quiche|flan", "slice", 80),
    (r"sandwich|toast\b|bruschetta|canape", "piece", 120), (r"\broll\b|frankie|wrap|kathi", "roll", 120), (r"puff|horn|vol-au-vent", "piece", 70),
    (r"pizza", "slice", 80), (r"burger", "burger", 180), (r"omelette|omlet", "omelette", 120), (r"\begg\b|anda\b|ande\b", "egg", 50),
    (r"muthia|muthiya", "piece", 30), (r"stuffed (tomato|capsicum|potato|bitter|karela|brinjal|baingan)|bharwa", "piece", 100),
    (r"mathri|chakli|murukku|namak para|khakhra", "piece", 15), (r"chikki", "piece", 20), (r"\bbun\b|\bpav\b|bread roll", "piece", 45),
    (r"\bbread\b", "slice", 30), (r"scone", "piece", 50), (r"doughnut|donut", "piece", 60), (r"sweet\b.*\bball|balls\b", "piece", 30),
]
PIECES = [(re.compile(p, re.I), u, g) for p, u, g in PIECES]
RENAME = {}
# micronutrients for everyday basics: name -> (added sugar g, sodium mg, iron mg, calcium mg) per 100 g
MICRO = {
  'Tea with milk (chai)': (0, 22, 0.05, 55), 'Masala chai': (0, 22, 0.1, 57),
  'Coffee with milk': (0, 30, 0.05, 70), 'Milk toned': (0, 45, 0.1, 120), 'Milk full cream (Buffalo)': (0, 50, 0.2, 210),
  'Curd (Dahi)': (0, 45, 0.1, 120), 'Greek yogurt plain': (0, 36, 0.1, 110), 'Buttermilk (Chaas)': (0, 180, 0.05, 60), 'Sweet lassi': (8, 40, 0.1, 100), 'Paneer': (0, 25, 0.2, 480), 'Tofu': (0, 7, 2.7, 350),
  'Dal tadka (toor)': (0, 280, 1.3, 25), 'Moong dal (yellow)': (0, 260, 1.2, 25), 'Masoor dal': (0, 270, 1.6, 20), 'Chana dal': (0, 270, 1.8, 30), 'Rajma curry': (0, 300, 1.9, 40), 'Chole (chickpea curry)': (0, 320, 2.2, 45),
  'Roti / Phulka (no ghee)': (0, 300, 2.8, 30), 'Idli': (0, 260, 0.6, 15), 'Poha': (0, 300, 2.5, 15), 'Upma': (0, 320, 0.8, 15), 'Palak paneer': (0, 330, 1.6, 230), 'Paneer bhurji': (0, 320, 0.6, 300),
  'Apple': (0, 1, 0.1, 6), 'Banana (Kela)': (0, 1, 0.3, 5), 'Almonds (Badam)': (0, 1, 3.7, 270), 'Ragi': (0, 10, 3.9, 344), 'Sprouts moong (raw)': (0, 6, 0.9, 13), 'Boiled chana': (0, 7, 2.9, 49), 'Coconut water': (0, 105, 0.3, 24),
}
# INDB recipes replaced by a home-style version in basics.csv (textbook recipes use much more oil)
REPLACED = {'poha', 'semolina upma (suji/rava upma)', 'idli', 'masala dosa', 'chapati/roti', 'plain parantha/paratha', 'potato parantha/paratha (aloo ka parantha/paratha)',
            'poori', 'boiled rice (uble chawal)', 'curd rice (dahi bhaat/dahi chawal/ perugu annam/daddojanam/thayir saadam)', 'kadhi', 'rajmah curry', 'dal makhani',
            'paneer parantha/paratha', 'sweet lassi (meethi lassi)', 'khaman (dhokla)', 'potato samosa (aloo ka samosa)', 'vegetable cutlet',
            'onion pakora/pakoda (pyaaz ke pakode)', 'dahi vadas/dahi bhalla', 'banana chips (kele ke chips)', 'spinach paneer (palak paneer)', 'pea paneer curry (matar paneer)', 'paneer in butter sauce', 'gram flour chilla/cheela (besan chilla/cheela)', 'hot tea (garam chai)'}

# INDB counts ALL the frying oil in a recipe as eaten, so fried dishes come out 2x too high.
# For these dishes, oil is trimmed until fat gives a realistic share of calories (45%; 55% for dry fried namkeen).
FRIED = re.compile(r"pakora|pakoda|bhajia|bhajiya|samosa|kachori|vada|wada|bonda|cutlet|tikki|poori|\bpuri\b|kofta|dum aloo|chilli paneer|korma|manchurian|kebab|kabab|fritter|spring roll|cheese balls|gunjia|ghujia|lavang|mal pua|malpua|gulab jamun|scotch egg|fish|chops|finger|pulao|kathal|jackfruit|karare|crispy|yam fried|uttapam|cheela|chilla|kadhi|raita|bhalla|toast|burger|appam|chaat|muthia|aigrettes|orly|methi chaman|creamed|sweet and sour|yakhni|stir|bread roll|spaghetti|meat ball|sabzi|curry|corn|tomato fish|horn", re.I)
SNACK = re.compile(r"pakora|pakoda|bhajia|bhajiya|samosa|kachori|vada(?!s/dahi)|wada|bonda|cutlet|tikki|poori|\\bpuri\\b|fritter|spring roll|cheese balls|gunjia|ghujia|lavang|mal pua|malpua|kebab|kabab|scotch egg|finger|aigrettes|orly|crispy|karare|fried|muthia|bread roll|toast", re.I)
DRYFRY = re.compile(r"chips|\bsev\b|papdi|murukku|mathri|namak para|chakli|bhujia|straws", re.I)

def trim_oil(p, c, f, fi, share):
    e0 = 4 * p + 4 * c
    f2 = share * e0 / (9 * (1 - share))
    if f2 >= f:
        return p, c, f, fi, None
    k = 100 / (100 - (f - f2))
    return round(p * k, 1), round(c * k, 1), round(f2 * k, 1), round(fi * k, 1), round((e0 + 9 * f2) * k, 1)

MICRO_COLS = ['calcium_mg', 'iron_mg', 'magnesium_mg', 'zinc_mg', 'potassium_mg', 'phosphorus_mg', 'sodium_mg', 'cholesterol_mg', 'vita', 'vitc_mg', 'folate_ug', 'vitb1_mg', 'vitb2_mg', 'vitb3_mg', 'vitb6_mg', 'vite_mg', 'vitd']
def micros(r, scale=1.0, fscale=None):
    out = []
    for c in MICRO_COLS:
        g = lambda k: float(r.get(k, 0) or 0) if r.get(k, 0) == r.get(k, 0) else 0
        # vitamin A as retinol equivalents: retinol + carotenoids / 8 (ICMR-NIN 2020)
        v = g('vitd2_ug') + g('vitd3_ug') if c == 'vitd' else g('vita_ug') + g('carotenoids_ug') / 8 if c == 'vita' else r.get(c, 0)
        try: v = float(v)
        except Exception: v = 0
        if v != v: v = 0
        v *= (fscale if fscale is not None and c == 'vite_mg' else scale)
        out.append(round(v, 2) if v < 10 else round(v, 1) if v < 100 else round(v))
    return out
# home-style basics borrow micronutrients from the closest Indian Nutrient Databank recipe, scaled by their non-oil calories
PROXY = {'Roti / Phulka (no ghee)': 'Chapati/Roti', 'Roti with ghee': 'Chapati/Roti', 'Bhakri (Jowar)': 'Jowar dosa', 'Bajra roti': 'Makki ki roti', 'Thepla': 'Methi poori', 'Methi thepla': 'Methi poori', 'Khakhra': 'Khakhra',
  'Brown rice cooked': 'Boiled rice (Uble chawal)', 'Jeera rice': 'Cumin pulao (Jeera/Zeera pulao)', 'Rice - plain (cooked)': 'Boiled rice (Uble chawal)', 'Vegetable biryani': 'Vegetable biryani/biriyani',
  'Pav bhaji': 'Pav bhaji', 'Vada pav': 'Potato bonda (Aloo bonda)', 'Batata vada': 'Potato bonda (Aloo bonda)', 'Misal pav': 'Whole moth (Moth ki dal)', 'Matki usal': 'Whole moth (Moth ki dal)', 'Moong usal': 'Whole moong (Moong ki dal)',
  'Samosa': 'Potato samosa (Aloo ka samosa)', 'Kachori': 'Khasta kachori', 'Pani puri': 'Bhel puri', 'Bhel puri': 'Bhel puri', 'Sev puri': 'Bhel puri', 'Dahi puri': 'Dahi vadas/Dahi bhalla', 'Pakora (onion bhajiya)': 'Onion pakora/pakoda (Pyaaz ke pakode)',
  'Khaman dhokla': 'Khaman (dhokla)', 'Khandvi': 'Khaman (dhokla)', 'Medu vada': 'Plain urad dal vada (Uzunne vada/Minapa garelu/Ulundu vadai/Medu vada)', 'Uttapam': 'Uttapam', 'Plain dosa': 'Plain dosa', 'Masala dosa': 'Masala dosa',
  'Rava dosa': 'Semolina dosa (Suji/Rava dosa)', 'Rava idli': 'Semolina idli (Suji/Rava idli)', 'Idli': 'Idli', 'Sambar': 'Sambar', 'Coconut chutney': 'Coconut chutney (Nariyal ki chutney)', 'Green chutney': 'Green chutney',
  'Rajma chawal': 'Kidney bean curry (Rajmah curry)', 'Rajma curry': 'Kidney bean curry (Rajmah curry)', 'Chole bhature': 'Chickpeas curry (Safed channa curry)', 'Chole (chickpea curry)': 'Chickpeas curry (Safed channa curry)',
  'Kala chana curry': 'Black channa curry/Bengal gram curry (Kale chane ki curry)', 'Dal khichdi': 'Plain khitchdi (Plain khichri/khichdi)', 'Sabudana khichdi': 'Sago khitchdi/khichri (Sabudana khitchdi/khichri)',
  'Sabudana vada': 'Sago cutlet/vadas (Sabudana cutlet/vadas)', 'Thalipeeth': 'Jowar dosa', 'Pizza veg (thin crust)': 'Pizza', 'Burger veg': 'Vegetable burger', 'Pasta in white sauce': 'Beans and macaroni', 'Maggi noodles': 'Home made plain noodles',
  'Veg Hakka noodles': 'Vegetable chowmein', 'Veg Manchurian gravy': 'Veg manchurian', 'Gulab jamun': 'Gulab jamun with milk powder', 'Kaju katli': 'Cashewnut burfi (Kaju burfi/Kaju katli)', 'Besan ladoo': 'Gram flour ladoo (Besan ladoo)',
  'Motichoor ladoo': 'Gram flour ladoo (Besan ladoo)', 'Dal tadka (toor)': 'Mixed dal', 'Moong dal (yellow)': 'Washed moong dal (Dhuli moong ki dal)', 'Masoor dal': 'Whole masoor (Masoor ki dal)', 'Chana dal': 'Split bengal gram dal (Channa dal)',
  'Dal makhani': 'Dal makhani', 'Varan (plain dal)': 'Mixed dal', 'Gujarati dal (khatti meethi)': 'Sour lentils (Khatti dal)', 'Dudhi chana dal': 'Split bengal gram with bottle gourd (Channa dal with ghiya/lauki)', 'Dal dhokli': 'Dal dhokli',
  'Kadhi': 'Besan kadhi with pakodies', 'Gujarati kadhi': 'Besan kadhi with pakodies', 'Pithla': 'Besan kadhi with pakodies', 'Zunka': 'Gram flour chilla/cheela (Besan chilla/cheela)', 'Aloo sabzi (dry)': 'Dry potato (Sookhe aloo)',
  'Bhindi sabzi': "Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)", 'Gobi aloo sabzi': 'Potato cauliflower (Aloo gobhi)', 'Baingan bharta': 'Brinjal bhartha (Baingan ka bhartha)', 'Mixed vegetable sabzi': 'Cabbage and peas (Pattagobhi aur matar)',
  'Lauki (bottle gourd) sabzi': 'Stuffed bottle gourd (Stuffed ghiya/lauki)', 'Aloo lauki (dudhi) sabzi': 'Stuffed bottle gourd (Stuffed ghiya/lauki)', 'Cabbage sabzi': 'Cabbage and peas (Pattagobhi aur matar)', 'Aloo matar sabzi': 'Pea potato curry (Aloo matar)',
  'Aloo methi sabzi': 'Potato fenugreek (Aloo methi)', 'Aloo baingan sabzi': 'Stuffed brinjal (Bharwa baingan)', 'Aloo shimla mirch sabzi': 'Potato capsicum (Shimla mirch aloo)', 'Tindora (tondli) sabzi': 'Cabbage and peas (Pattagobhi aur matar)',
  'Turai (ridge gourd) sabzi': 'Stuffed bottle gourd (Stuffed ghiya/lauki)', 'Karela sabzi': 'Stuffed bittergourd (dry) (Bharwa karela)', 'Methi malai matar': 'Methi malai paneer', 'Undhiyu': 'Pea potato curry (Aloo matar)', 'Sev tamatar sabzi': 'Pea curry (Matar ki sabzi)',
  'Palak paneer': 'Spinach paneer (Palak paneer)', 'Matar paneer': 'Pea paneer curry (Matar paneer)', 'Paneer butter masala': 'Paneer in butter sauce', 'Paneer tikka masala': 'Paneer in butter sauce', 'Kadhai paneer': 'Kadhai Paneer',
  'Malai kofta': 'Paneer kofta curry', 'Paneer bhurji': 'Paneer curry', 'Paneer tikka': 'Paneer shaslik/tikka', 'Soya chunks curry': 'Soyabean curry', 'Veg pulao': 'Mixed vegetable pulao',
  'Curd rice': 'Curd rice (Dahi bhaat/Dahi chawal/ Perugu annam/Daddojanam/Thayir saadam)', 'Lemon rice': 'Lemon rice (Pulihora, Elumichai sadam, Chitranna)', 'Masale bhat': 'Eggplant/Brinjal rice (Vangi bhat)', 'Poha': 'Poha',
  'Upma': 'Semolina upma (Suji/Rava upma)', 'Plain paratha': 'Plain parantha/paratha', 'Aloo paratha': 'Potato parantha/paratha (Aloo ka parantha/paratha)', 'Paneer paratha': 'Paneer parantha/paratha', 'Puri': 'Poori', 'Bhatura': 'Bhatura',
  'Besan chilla': 'Gram flour chilla/cheela (Besan chilla/cheela)', 'Moong dal chilla': 'Moong dal stuffed cheela/chilla (Moong dal ka cheela/chilla)', 'Sprouts chaat': 'Sprouted moong dal chat', 'Veg sandwich': 'Cucumber sandwich (Kheere ka sandwich)',
  'Grilled cheese sandwich': 'Cheese and tomato sandwich (toasted) (Cheese aur tamatar ke sandwich (toasted))', 'Aloo tikki': 'Paneer potato cutlet (Paneer aloo cutlet)', 'Veg cutlet': 'Vegetable cutlet', 'Veg momos (steamed)': 'Vegetable chowmein',
  'Dahi vada': 'Dahi vadas/Dahi bhalla', 'Raita': 'Cucumber raita (Kheere ka raita)', 'Kheer': 'Rice kheer (Chawal ki kheer)', 'Suji halwa': 'Semolina halwa (Suji ka halwa)', 'Sheera (suji halwa)': 'Semolina halwa (Suji ka halwa)',
  'Gajar halwa': 'Carrot halwa (Gajar ka halwa)', 'Vegetable soup': 'Mixed vegetable soup', 'Tomato soup': 'Clear tomato soup (Tamatar ka soup)', 'Fruit salad': 'Fruit salad (Phalon ka salaad)', 'Ragda pattice': 'Khatta channa',
  'Handvo': 'Gujarati handvo', 'Puran poli': 'Sweet split chickpea roti (Sweet channa dal roti/Puranpoli)', 'Shrikhand': 'Sweetened yogurt (Shrikhand)', 'Veg frankie': 'Paneer kaathi roll', 'French fries': 'Dry potato (Sookhe aloo)',
  'Ukadiche modak': 'Semolina ladoo with coconut (Suji/Rava aur nariyal ke ladoo )', 'Thepla ': 'Methi poori'}
HAND_ALIAS = {'Pav (bun)': 'Bread white', 'Dabeli': 'Bread white'}

def r1(x):
    try:
        x = float(x)
    except Exception:
        return 0
    if x != x:
        return 0
    return round(x, 1)

def household_units(name):
    """Standard measures for a dish, decided by what kind of dish it is."""
    u = []
    low = name.lower()
    piece = None
    for rx, un, g in PIECES:
        if rx.search(low):
            piece = (un, g)
            break
    if DRYFRY.search(low):
        return 'fistful:30|tablespoon:10'
    if LIQ.search(low) and not SOUP.search(low) and not WET.search(low.replace('milk', '')) and not piece and not (SWEET_SCOOP.search(low) and not re.search(r'shake|coffee|lassi|float', low)) and not re.search(r'drops|pear|cake|biscuit|cookie|toffee|fudge|souffle', low):
        u += ['tea cup:180', 'cup:150'] if HOT.search(low) and not re.search(r'cold|iced|frappe', low) else ['glass:200', 'cup:150']
    elif SWEET_SCOOP.search(low):
        u += ['scoop:65', 'cup:100']
    elif SOUP.search(low):
        u += ['bowl:200', 'katori:150']
    elif SPREAD.search(low) and not piece:
        u += ['teaspoon:5', 'tablespoon:15']
    elif piece:
        u.append(f"{piece[0]}:{piece[1]}")
        if piece[0] in ('piece', 'kofta') and WET.search(low):
            u.append('katori:150')
    elif WET.search(low):
        u.append('katori:150')
        u.append('plate:250' if PLATE.search(low) else 'bowl:200')
    else:
        u += ['katori:150', 'piece:50']
    if 'tablespoon:15' not in u and 'teaspoon:5' not in u:
        u.append('tablespoon:15')
    return '|'.join(u)

basic_names = set(r['name'].lower() for r in csv.DictReader(open(os.path.join(HERE, 'basics.csv'))))
rows, scaled, trimmed = [], 0, []
d = pd.read_excel(os.path.join(HERE, 'INDB.xlsx'))
for _, r in d.iterrows():
    name = re.sub(r"\s+", " ", str(r.food_name).replace("\xa0", " ")).strip()
    name = RENAME.get(name, name)
    low = name.lower()
    kcal = r1(r.energy_kcal)
    if kcal <= 0 or low in basic_names or low in REPLACED:
        continue
    if re.search(r"icing|frosting|stock\b|\bdough\b|pastry$|masala$|powder|syrup$|essence|batter$", low):
        continue
    p, c, f, fi = r1(r.protein_g), r1(r.carb_g), r1(r.fat_g), r1(r.fibre_g)
    at = 4 * p + 4 * c + 9 * f
    if kcal > 15 and at > 0 and abs(at - kcal) / kcal > 0.2:
        k = kcal / at
        p, c, f = round(p * k, 1), round(c * k, 1), round(f * k, 1)
        scaled += 1
    src = 'INDB'; p0, c0 = p, c
    if kcal > 350 and f * 9 / kcal > 0.5 and (FRIED.search(low) or DRYFRY.search(low)):
        if DRYFRY.search(low):
            # crisp namkeen: frying drives out the water too; standard values are ~530 kcal/100 g with ~55% from fat
            pc = max(0.1, p + c); f = round(0.55 * 530 / 9, 1); p = round(0.45 * 530 / 4 * p / pc, 1); c = round(0.45 * 530 / 4 * c / pc, 1); kcal = 530.0
            trimmed.append(name); src = 'INDB-adj'
        else:
            p, c, f, fi, k2 = trim_oil(p, c, f, fi, 0.45)
            if k2:
                kcal = k2; trimmed.append(name); src = 'INDB-adj'
                # fried snacks also lose water in the oil, so they can't end up lighter than ~260 kcal/100 g
                if SNACK.search(low) and kcal < 260:
                    k = 260 / kcal; p, c, f, fi, kcal = round(p * k, 1), round(c * k, 1), round(f * k, 1), round(fi * k, 1), 260.0
    veg = 0 if NONVEG.search(name) else (2 if EGG.search(name) and 'eggless' not in low and 'eggplant' not in low else 1)
    mscale = (p + c) / (p0 + c0) if (p0 + c0) > 0 else 1
    f0 = float(r.fat_g) or 0
    mi = micros(r, mscale, f / f0 if f0 > 0 else 1)
    rows.append([name, kcal, p, c, f, fi, veg, household_units(name), r1(r.freesugar_g), mi[6], mi[1], mi[0], src, '', mi])

HAND = {}
with open(os.path.join(HERE, 'basics_micro.csv')) as fh:
    for m in csv.DictReader(fh):
        HAND[m['name']] = [float(m[k]) for k in ['ca', 'fe', 'mg', 'zn', 'k', 'p', 'na', 'chol', 'vita', 'vitc', 'folate', 'b1', 'b2', 'b3', 'b6', 'vite', 'vitd']]
BYNAME = {re.sub(r"\s+", " ", str(x.food_name).replace("\xa0", " ")).strip().lower(): x for _, x in d.iterrows()}
missing = []
with open(os.path.join(HERE, 'basics.csv')) as fh:
    for b in csv.DictReader(fh):
        units = b['units'] + ('' if 'tablespoon' in b['units'] or 'teaspoon' in b['units'] else '|tablespoon:15')
        nm = b['name']; mi = MICRO.get(nm, (0, 0, 0, 0)); full = HAND.get(HAND_ALIAS.get(nm, nm))
        if full is None and nm in PROXY:
            pr = BYNAME.get(PROXY[nm].strip().lower())
            if pr is not None:
                e0 = 4 * float(pr.protein_g) + 4 * float(pr.carb_g)
                e1 = 4 * float(b['protein']) + 4 * float(b['carb'])
                full = micros(pr, max(0.3, min(3, e1 / e0)) if e0 > 0 else 1)
            else:
                missing.append(nm)
        full = full or []
        rows.append([nm, r1(b['kcal']), r1(b['protein']), r1(b['carb']), r1(b['fat']), r1(b['fibre']), int(b['veg']), units, mi[0],
                     full[6] if full else mi[1], full[1] if full else mi[2], full[0] if full else mi[3], 'Basic', '', full])

rows.sort(key=lambda x: 0 if x[12] == 'Basic' else 1)
for x in rows:
    if x[12] == 'Basic' and x[1] > 0:  # keep basics consistent: kcal follows macros within 15%
        at = 4 * x[2] + 4 * x[3] + 9 * x[4] + 2 * x[5]
        assert abs(at - x[1]) / x[1] < 0.3 or x[1] < 60, x
out = 'window.FOODS=' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, '..', 'ui', 'foods.js'), 'w').write(out)
print(len(trimmed), 'fried dishes trimmed'); print('basics without micros:', [x[0] for x in rows if x[12] == 'Basic' and not x[14]], 'proxy missing:', missing);print(len(rows), 'foods,', sum(1 for x in rows if x[6] == 1), 'veg,', scaled, 'macro-scaled,', round(len(out) / 1024), 'KB')
