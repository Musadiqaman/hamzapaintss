import express from 'express';
const router = express.Router();
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import ItemDefinition from "../models/ItemDefinition.js";
import { deleteAndSync } from "../app.js";

// 1. ADD PAGE RENDER
router.get('/add', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const role = req.user.role;
        const brands = await ItemDefinition.distinct("brandName");
        res.render('addDynamicData', { role, brands });
    } catch (err) {
        console.error("Error fetching brands:", err);
        res.render('addDynamicData', { role: req.user.role, brands: [] });
    }
});

// 2. API: GET ITEMS FOR A SPECIFIC BRAND
router.get('/api/get-items/:brandName', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const brand = await ItemDefinition.findOne({ 
            brandName: { $regex: new RegExp(`^${req.params.brandName}$`, "i") } 
        });
        if (brand) {
            const itemNames = brand.products.map(p => p.itemName);
            res.json(itemNames);
        } else {
            res.json([]);
        }
    } catch (err) {
        res.status(500).json([]);
    }
});

// 3. POST: ADD OR UPDATE ITEM
router.post('/add-item', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { itemsList, brandName, colors, units } = req.body;
        
        const finalBrandName = brandName.trim(); 
        const formattedUnits = units ? units.map(u => ({ unitname: u.trim() })) : [];

        let brandDoc = await ItemDefinition.findOne({ 
            brandName: { $regex: new RegExp(`^${finalBrandName}$`, "i") } 
        });

        if (!brandDoc) {
            const products = itemsList.map(name => ({
                itemName: name.trim(),
                hasColors: colors.length > 0,
                colors: colors
            }));
            brandDoc = new ItemDefinition({ 
                brandName: finalBrandName, 
                units: formattedUnits, 
                products 
            });
        } else {
            if (units && units.length > 0) {
                units.forEach(newUnitStr => {
                    const cleanUnit = newUnitStr.trim();
                    const exists = brandDoc.units.some(u => u.unitname.toLowerCase() === cleanUnit.toLowerCase());
                    if (!exists) brandDoc.units.push({ unitname: cleanUnit });
                });
            }

            itemsList.forEach(itemName => {
                const cleanItemName = itemName.trim();
                const idx = brandDoc.products.findIndex(p => p.itemName.toLowerCase() === cleanItemName.toLowerCase());
                
                if (idx > -1) {
                    const oldColors = brandDoc.products[idx].colors || [];
                    colors.forEach(newCol => {
                        const exists = oldColors.some(c => c.colour.toLowerCase() === newCol.colour.toLowerCase());
                        if (!exists) oldColors.push(newCol);
                    });
                    brandDoc.products[idx].colors = oldColors;
                    brandDoc.products[idx].hasColors = oldColors.length > 0;
                } else {
                    brandDoc.products.push({ 
                        itemName: cleanItemName, 
                        hasColors: colors.length > 0, 
                        colors 
                    });
                }
            });
        }

        brandDoc.syncedToAtlas = false; // ✅ hamesha false karo save se pehle
        await brandDoc.save();
        res.json({ success: true });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. ALL DATA VIEW
router.get('/all', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const role = req.user.role;
        const allDefinitions = await ItemDefinition.find().sort({ brandName: 1 });
        res.render('allDynamicData', { role, allDefinitions });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

// 5. DELETE BRAND
router.post('/delete-brand', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const brandId = req.body.brandId;

        const brand = await ItemDefinition.findById(brandId);
        if (!brand) {
            return res.status(404).json({ success: false, message: "Brand nahi mila!" });
        }

        await deleteAndSync(ItemDefinition, brandId); // ✅ PendingDelete automatically handle hota hai

        res.json({ success: true, message: "Poora Brand aur uske products delete ho gaye! 🗑️" });
    } catch (err) { 
        console.error("🔴 Error deleting brand:", err);
        res.status(500).json({ success: false, message: "Brand delete karne mein masla hua." }); 
    }
});

// 6. DELETE PRODUCT
router.post('/delete-product', isLoggedIn, allowRoles("admin","worker"), async (req, res) => {
    try {
        const { brandId, productId } = req.body;

        const brand = await ItemDefinition.findById(brandId);
        if (!brand) return res.status(404).json({ success: false, message: "Brand nahi mila!" });

        const productExists = brand.products.some(p => p._id.toString() === productId);
        if (!productExists) return res.status(404).json({ success: false, message: "Product nahi mila!" });

        // ✅ $pull + syncedToAtlas: false ek saath
        await ItemDefinition.findByIdAndUpdate(
            brandId, 
            { 
                $pull: { products: { _id: productId } },
                $set: { syncedToAtlas: false }
            },
            { new: true }
        );

        res.json({ success: true, message: "Item kamyabi se nikal diya gaya! 🗑️" });
    } catch (err) { 
        console.error("🔴 Error pulling product:", err);
        res.status(500).json({ success: false, message: "Item delete nahi ho saka." }); 
    }
});

// 7. DELETE COLOR
router.post('/delete-color', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { brandId, productId, colorId } = req.body;

        const brand = await ItemDefinition.findById(brandId);
        if (!brand) return res.status(404).json({ success: false, message: "Brand nahi mila!" });

        const product = brand.products.find(p => p._id.toString() === productId);
        if (!product) return res.status(404).json({ success: false, message: "Product nahi mila!" });

        const colorExists = product.colors.some(c => c._id.toString() === colorId);
        if (!colorExists) return res.status(404).json({ success: false, message: "Color nahi mila!" });

        // ✅ $pull + syncedToAtlas: false ek saath
        const result = await ItemDefinition.findOneAndUpdate(
            { _id: brandId, "products._id": productId },
            { 
                $pull: { "products.$.colors": { _id: colorId } },
                $set: { syncedToAtlas: false }
            },
            { new: true }
        );

        if (!result) return res.status(404).json({ success: false, message: "Color delete karne ke liye data nahi mila!" });

        res.json({ success: true, message: "Color list se saaf kar diya gaya! 🗑️" });
    } catch (err) { 
        console.error("🔴 Error pulling color:", err);
        res.status(500).json({ success: false, message: "Color delete karne mein error aya." }); 
    }
});


// 8. DELETE UNIT
router.post('/delete-unit', isLoggedIn, allowRoles("admin", "worker"), async (req, res) => {
    try {
        const { brandId, unitId } = req.body;
        
        const brand = await ItemDefinition.findById(brandId);
        if (!brand) return res.status(404).json({ success: false, message: "Brand nahi mila!" });

        const unitExists = brand.units.some(u => u._id.toString() === unitId);
        if (!unitExists) return res.status(404).json({ success: false, message: "Unit nahi mila!" });

        // ✅ $pull + syncedToAtlas: false ek saath
        const result = await ItemDefinition.findByIdAndUpdate(
            brandId,
            { 
                $pull: { units: { _id: unitId } },
                $set: { syncedToAtlas: false }
            },
            { new: true }
        );

        if (!result) return res.status(404).json({ success: false, message: "Unit ya Brand nahi mila!" });

        res.json({ success: true, message: "Unit kamyabi se delete kar diya gaya! 🗑️" });
    } catch (err) {
        console.error("🔴 Unit Delete Error:", err);
        res.status(500).json({ success: false, message: "Unit delete karne mein error aya." });
    }
});



export default router;