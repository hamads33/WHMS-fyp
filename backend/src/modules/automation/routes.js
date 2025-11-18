const express = require('express');
const profileController = require('./controllers/profile.controller');
const taskController = require('./controllers/task.controller');
const actionController = require('./controllers/action.controller');
const testController = require('./controllers/test.controller');

const router = express.Router();

/* ------------------------------------
 * PROFILE ROUTES
 * ----------------------------------*/
router.get('/profiles', profileController.listProfiles);
router.post('/profiles', profileController.createProfile);
router.get('/profiles/:id', profileController.getProfile);
router.put('/profiles/:id', profileController.updateProfile);
router.delete('/profiles/:id', profileController.deleteProfile);

/* ------------------------------------
 * TASK ROUTES
 * ----------------------------------*/

// Create task
router.post('/tasks', taskController.createTask);

// Get single task
router.get('/tasks/:id', taskController.getTask);

// Update task (THIS WAS MISSING)
router.put('/tasks/:id', taskController.updateTask);

// Delete task (THIS WAS MISSING)
router.delete('/tasks/:id', taskController.deleteTask);

// Run task manually
router.post('/tasks/:id/run', taskController.runTaskNow);

/* ------------------------------------
 * ACTION ROUTES (Plugins)
 * ----------------------------------*/
router.get('/actions', actionController.listActions);

/* ------------------------------------
 * TEST ACTION ROUTE
 * ----------------------------------*/
router.post('/actions/:actionId/test', testController.testAction);

module.exports = router;
