# Deployment Preparation TODO

## Plan Progress Tracker

- [x] 1. Install morgan: `npm install morgan`
- [x] 2. Update .env - Add all required environment variables (DB, JWT_SECRET, CASHFREE_APP_ID, CASHFREE_APP_SECRET, API_KEY, GOOGLE_AI_API_KEY, PORT, NODE_ENV)
- [x] 3. Update config/config.json - Use ${DB_USER} etc. interpolation
- [x] 4. Refactor Utils/util.js - Load config.json dynamically instead of hardcoded DB
- [x] 5. Update services/cashFreeService.js - Use process.env.CASHFREE_APP_ID & _SECRET
- [x] 6. Update Controller/signupController.js - Remove JWT_SECRET hardcoded fallback
- [x] 7. Update app.js - Add morgan('combined', {stream to logs/app.log}), PORT=process.env.PORT||3000, create logs dir
- [x] 8. Update package.json - Add morgan to dependencies, update start script with NODE_ENV
- [ ] 9. Test: Create logs/, npm run start, verify logs/app.log created, no console hardcode errors, payments/DB work

**Next:** Execute step 1 after confirming file creation.

