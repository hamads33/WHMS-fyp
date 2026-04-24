const router = require("express").Router();
const ctrl = require("../controllers/webhook.controller");
const Joi = require("joi");
const webhookService = require("../services/webhook.service");
const webhookSettings = require("../services/webhook-settings.service");

function validateWebhook(req, res, next) {
  const schema = Joi.object({
    url: Joi.string().uri().required(),
    events: Joi.array()
      .items(Joi.string().valid(...webhookService.VALID_EVENTS))
      .min(1)
      .required(),
    secret: Joi.string().max(128).optional().allow(null, ""),
    isActive: Joi.boolean().optional(),
  });
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(422).json({ error: "Validation failed", details: error.details.map((d) => d.message) });
  }
  req.body = value;
  next();
}

router.get("/settings", async (req, res) => {
  try {
    res.json(await webhookSettings.get());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const { enabledEvents } = req.body;
    if (!enabledEvents || typeof enabledEvents !== "object") {
      return res.status(422).json({ error: "enabledEvents object required" });
    }
    res.json(await webhookSettings.update(enabledEvents));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", validateWebhook, ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
