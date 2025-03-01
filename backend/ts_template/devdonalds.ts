import express, { Request, Response } from "express";

// ==== Type Definitions, feel free to add or modify ==========================
interface cookbookEntry {
  name: string;
  type: string;
}

interface requiredItem {
  name: string;
  quantity: number;
}

interface recipe extends cookbookEntry {
  requiredItems: requiredItem[];
}

interface ingredient extends cookbookEntry {
  cookTime: number;
}

// =============================================================================
// ==== HTTP Endpoint Stubs ====================================================
// =============================================================================
const app = express();
app.use(express.json());

// Store your recipes here!
const cookbook = new Map<string, recipe | ingredient>();

// Task 1 helper (don't touch)
app.post("/parse", (req: Request, res: Response) => {
  const { input } = req.body;

  const parsed_string = parse_handwriting(input)
  if (parsed_string == null) {
    res.status(400).send("this string is cooked");
    return;
  }
  res.json({ msg: parsed_string });
  return;

});

// [TASK 1] ====================================================================
// Takes in a recipeName and returns it in a form that
const parse_handwriting = (recipeName: string): string | null => {
  recipeName = recipeName.replace(/[-_]/g, ' ')
  recipeName = recipeName.split("")
    .filter(c => /[a-zA-Z\s]/.test(c)).join("");
  recipeName = recipeName.replace(/\s+/g, ' ').trim();

  recipeName = recipeName.toLowerCase();
  recipeName = recipeName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (recipeName === "") ? null : recipeName;
}

// [TASK 2] ====================================================================
// Endpoint that adds a CookbookEntry to your magical cookbook
app.post("/entry", (req: Request, res: Response) => {
  if (!["recipe", "ingredient"].includes(req.body.type)) {
    res.status(400).send("<type> must be of value 'recipe' or 'ingredient'");
    return;
  }
  if (cookbook.has(req.body.name)) {
    res.status(400).send("Only unique names permitted");
    return;
  }
  (req.body.type === "ingredient" ? handle_ingredient(req.body, res) : handle_recipe(req.body, res));
});


function handle_ingredient(ingredient: any, res: Response) {
  if (ingredient.cookTime < 0) {
    res.status(400).send("<cookTime> must be of value >= 0");
    return;
  }
  const entry: ingredient = {
    name: ingredient.name,
    type: ingredient.type,
    cookTime: ingredient.cookTime
  }
  cookbook.set(entry.name, entry);
  res.status(200).send(""); /* Successful ingredient parse */
}

function handle_recipe(recipe: any, res: Response) {
  const names: string[] = [];
  recipe.requiredItems.forEach((item: requiredItem) => names.push(item.name));
  const entry: recipe = {
    name: recipe.name,
    type: recipe.type,
    requiredItems: recipe.requiredItems
  };
  if (new Set(names).size !== names.length) {
    res.status(400).send("Only one element per requiredItem");
    return;
  }
  cookbook.set(entry.name, entry);
  res.status(200).send(""); /* Successful recipe parse */
}


// [TASK 3] ====================================================================
// Endpoint that returns a summary of a recipe that corresponds to a query name

app.get("/summary", (req: Request, res: Request) => {
  let sum = 0;
  const ingredients = [];
  let quantities;
  try {
    quantities = getQuantities(req.query.name);
  }
  catch (e){
   res.status(400).send(e.message);
    return;
  }
  quantities.forEach((quantity, name) =>
  {
    if (!cookbook.has(name)){
      res.status(400).send("No ingredient found with name");
      return;
    }
    const ingredient = cookbook.get(name);
    // @ts-ignore: Property 'cookTime' does not exist on type 'recipe | ingredient'
    sum += ingredient.cookTime * quantity;
    ingredients.push({name, quantity});
  });

  res.status(200).json({name: req.body.name, cookTime: sum, ingredients});
});

function getQuantities(name: string ) {
  if (!cookbook.has(name)){
    throw new Error('No entry with given name: ' + name);
  }
  const quantities = new Map<string, number>;
  const entry = cookbook.get(name);
  if (entry.type === "recipe") {
    // @ts-ignore: Property 'requiredItems' does not exist on type 'recipe | ingredient'.
    entry.requiredItems.forEach((item: requiredItem) => {
      if (cookbook.get(item.name).type === "recipe") {
        const subQuantities = getQuantities(item.name);
        subQuantities.forEach((quantity,name) => add_ingredients(quantities, name, quantity * item.quantity));
        return;
      }
      add_ingredients(quantities, item.name, item.quantity);
    })
  }
  else {
    throw new Error('Given must be of type recipe');
  }
  return quantities;
}

function add_ingredients(quantities: Map<string, number>, name: string, quantity: number) {
  if (quantities.has(name)) {
    quantities.set(name, quantities.get(name) + quantity);
  } else {
    quantities.set(name, quantity);
  }
}

// =============================================================================
// ==== DO NOT TOUCH ===========================================================
// =============================================================================
const port = 8080;
app.listen(port, () => {
  console.log(`Running on: http://127.0.0.1:8080`);
});
