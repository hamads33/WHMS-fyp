const express = require("express");
const ProfileController = require("./controllers/profile.controller");
const TaskController = require("./controllers/task.controller");
const RunController = require("./controllers/run.controller");

const validate = require("./middleware/validate");
const responseFormatter = require("./middleware/responseFormatter");
const errorHandler = require("./middleware/errorHandler");

const profileSchema = require("./validators/profile.validator");
const taskSchema = require("./validators/task.validator");
const { idParamSchema, profileIdParamSchema, taskIdParamSchema } = require("./validators/params.validator");

module.exports = (router, deps) => {
  // attach automation-only response behavior
  router.use(responseFormatter);

  const profileCtrl = new ProfileController(deps);
  const taskCtrl = new TaskController(deps);
  const runCtrl = new RunController(deps);

  // PROFILES
  router.get("/profiles", profileCtrl.list.bind(profileCtrl));
  router.post("/profiles", validate(profileSchema), profileCtrl.create.bind(profileCtrl));
  router.get("/profiles/:id", validate(idParamSchema, "params"), profileCtrl.get.bind(profileCtrl));
  router.put("/profiles/:id", validate(idParamSchema, "params"), validate(profileSchema), profileCtrl.update.bind(profileCtrl));
  router.delete("/profiles/:id", validate(idParamSchema, "params"), profileCtrl.delete.bind(profileCtrl));
  router.post("/profiles/:id/enable", validate(idParamSchema, "params"), profileCtrl.enable.bind(profileCtrl));
  router.post("/profiles/:id/disable", validate(idParamSchema, "params"), profileCtrl.disable.bind(profileCtrl));

  // TASKS
  router.get("/profiles/:id/tasks", validate(profileIdParamSchema, "params"), taskCtrl.listForProfile.bind(taskCtrl));
  router.post("/profiles/:id/tasks", validate(profileIdParamSchema, "params"), validate(taskSchema), taskCtrl.createForProfile.bind(taskCtrl));
  router.get("/tasks/:id", validate(taskIdParamSchema, "params"), taskCtrl.get.bind(taskCtrl));
  router.put("/tasks/:id", validate(taskIdParamSchema, "params"), validate(taskSchema), taskCtrl.update.bind(taskCtrl));
  router.delete("/tasks/:id", validate(taskIdParamSchema, "params"), taskCtrl.delete.bind(taskCtrl));
  router.post("/tasks/:id/run", validate(taskIdParamSchema, "params"), taskCtrl.runNow.bind(taskCtrl));

  // RUN PROFILE
  router.post("/run/:profileId", validate(profileIdParamSchema, "params"), runCtrl.runNow.bind(runCtrl));

  // ACTIONS
  router.get("/actions", (req, res) => {
    const list = require("./services/builtInActions.service").listActions();
    res.success(list);
  });

  // Automation-only error handler
  router.use(errorHandler(deps.logger));

  return router;
};
