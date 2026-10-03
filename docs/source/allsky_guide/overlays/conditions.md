# Conditional Styles

A text field can change how it looks depending on its value: for example, show the dew heater state in green when it's on and red when it's off, or a temperature in blue below freezing and red above 25 °C.

Conditions work on fields that contain **only one variable and no other text**, e.g. `${TEMPERATURE_C}` or `${DEWCONTROLHEATER}`. The style applies to the whole field, so with `Heater: ${DEWCONTROLHEATER}` the word "Heater:" would change colour too. Put any other text, such as a label, in its own field next to it, and give each value you want to style its own field.

## Setting up conditions { data-toc-label="Setting up conditions" }

1. Select the text field.
2. In the field's properties, click the **Conditions** button next to **Colour**. It is only enabled when the field contains only one variable of a supported type and no other text, and turns green when the field has conditions.
3. Each rule is one row: the condition on the left, then its colour and a sample of how it looks. Click **Add rule** for more rows. Check them with **Try a value**: the rule that's used is outlined in green. Then click **Apply**.
4. Save the overlay as usual.

**Remove conditions** in the dialog takes them off the field again.

## Kinds of rules { data-toc-label="Kinds of rules" }

The kind of rules follows the variable's type and can't be changed. That way a value is never compared in a way it wasn't meant for.

| Variable type | Rules |
|---------------|-------|
| **Yes / No** (e.g. the dew heater state, a planet's *Visible*) | One style for **yes**, one for **no**. Yes, on, true and 1 count as yes; no, off, false and 0 count as no. Untick a case to leave the field as it is for that value. |
| **Number** (numbers, temperatures, percentages, angles, …) | Any number of rows, each with a condition such as `< 0` or `>= 25`. Click the :fontawesome-solid-plus: after the condition to add a second one to the row, e.g. `> 11` **and** `≤ 12`; the :fontawesome-solid-minus: removes it again. The operators are `<`, `≤`, `>`, `≥` and `=`, so you decide whether a boundary is included. |
| **Text** | Any number of rows with **equals**, **contains** or **starts with**. Upper and lower case don't matter. |

For numbers and text, **the first row that matches is used**, so order the rows from the most specific to the most general. Use the :fontawesome-solid-arrow-up: and :fontawesome-solid-arrow-down: buttons to move a row, and :fontawesome-regular-trash-can: to delete it.

If no row matches, or the variable has no value, the field keeps its own style.

## What a rule can change { data-toc-label="What a rule can change" }

Each rule sets the **colour**. Click :fontawesome-solid-sliders: in its row to also change:

- the **stroke** colour (tick the box next to it) and stroke **width**,
- the **opacity** (0 to 1),
- the **font** and its **size**.

Anything you leave empty keeps the field's own setting.

Some modules colour their values themselves, e.g. the Space Weather module shows the Kp index in green, yellow or red. Conditions are applied **after** that, so a matching rule overrides the module's colour.

## Rule sets { data-toc-label="Rule sets" }

If several fields use the same rules, for example *On/Off* for every switch, save the rules once and reuse them. Everything about rule sets is in the :fontawesome-regular-bookmark: menu at the top right of the dialog:

- **Save these rules as a rule set…** stores the rules under a name in this overlay. Other fields of the same kind can then pick it in the same menu. Changing a rule set changes every field that uses it.
- If you change the rules of a field that uses a rule set and click **Apply**, only that field gets the changed rules; the rule set stays as it is.
- **Copy a rule set from another overlay…** copies a rule set from another overlay, e.g. from your daytime overlay into your nighttime one.

Rule sets are stored in the overlay itself, so an overlay you share or copy keeps them.

## Example { data-toc-label="Example" }

A temperature field with three rows:

| When value | Colour |
|------------|--------|
| `< 0` | blue |
| `>= 0` and `<= 25` | white |
| `> 25` | red |

Try a few values in **Try a value** before applying: `-3` shows blue, `25` white (25 is included in the second row) and `25.5` red.
