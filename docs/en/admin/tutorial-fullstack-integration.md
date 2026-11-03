# Full-Stack Integration Tutorial

This tutorial uses the "Article Management" module as an example to connect the backend and frontend end to end, covering permission configuration, menu configuration, API integration, and the complete workflow in between.

## 1. Preparation

### 1.1 Environment Check

Make sure the following environment is ready:

- Go 1.18+
- Node.js 16+
- pnpm
- Docker Compose (used to start the dependency services)
- PostgreSQL / MySQL
- Redis

### 1.2 Start the Backend Dependencies

```shell
cd backend
./scripts/docker/libs_only.sh
```

This starts PostgreSQL, Redis, MinIO, and other dependency services.

## 2. Backend Development (Completed)

Assume the backend "Article Management" module has already been developed (see [Backend Tutorial: Adding a New Business Module](/en/admin/backend-tutorial-new-module.md)), including:

- ✅ Protobuf definitions
- ✅ Ent schema
- ✅ Data layer implementation
- ✅ Service layer implementation
- ✅ Server registration
- ✅ Wire dependency injection
- ✅ OpenAPI documentation generation

Verify the backend APIs:

```shell
cd backend
gow run admin
```

Visit <http://localhost:7788/docs/> and confirm that the ArticleService APIs have appeared in the Swagger UI.

## 3. Frontend Development (Completed)

Assume the frontend page development has been completed (see [Frontend Tutorial: Adding a New Business Page](/en/admin/frontend-tutorial-new-page.md)), including:

- ✅ API service layer
- ✅ Composable layer
- ✅ Page components
- ✅ Route registration

## 4. Permission and Menu Configuration

This is the key step of full-stack integration: menus and permissions need to be configured in the admin management system.

### 4.1 Log In to the Admin Console

Log in to the admin management system with the default account `admin` / `admin`.

### 4.2 Create Menus

Go to **Permission Management → Menu Management** and click "New Menu".

#### Create a Top-Level Directory

| Field | Value |
|------|-----|
| Menu name | Article Management |
| Parent menu | None (top level) |
| Menu type | Directory |
| Route path | `/app/article` |
| Component path | Leave empty |
| Icon | `mdi:file-document-outline` |
| Order | 100 |
| Visible | Yes |
| Cached | No |

Click "Submit" to save.

#### Create a Second-Level Menu (List Page)

Click "New Menu" again:

| Field | Value |
|------|-----|
| Menu name | Article List |
| Parent menu | Article Management |
| Menu type | Menu |
| Route path | `index` |
| Component path | `/app/article/index` |
| Icon | Leave empty |
| Order | 1 |
| Visible | Yes |
| Cached | Yes |
| Permission code | `article:list` |

Click "Submit" to save.

#### Create Button Permissions (Optional)

If button-level permission control is needed, continue creating:

**New button**:

| Field | Value |
|------|-----|
| Menu name | Create Article |
| Parent menu | Article List |
| Menu type | Button |
| Permission code | `article:create` |

**Edit button**:

| Field | Value |
|------|-----|
| Menu name | Edit Article |
| Parent menu | Article List |
| Menu type | Button |
| Permission code | `article:update` |

**Delete button**:

| Field | Value |
|------|-----|
| Menu name | Delete Article |
| Parent menu | Article List |
| Menu type | Button |
| Permission code | `article:delete` |

### 4.3 Assign Permissions to a Role

Go to **Permission Management → Role Management** and select the role to authorize (e.g. "Super Administrator").

1. Click "Set Permissions"
2. Check "Article Management" and its sub-menus in the permission tree
3. Click "OK" to save

### 4.4 Verify the Menu Display

Log out and log in again, then check the left menu — the "Article Management" menu item should be visible.

## 5. API Integration Testing

### 5.1 Check the Environment Variables

Confirm that the API address in the frontend `.env.development` is configured correctly:

```ini
VITE_GLOB_API_URL=http://localhost:7788
```

### 5.2 Start the Frontend

```shell
cd frontend/admin/vue-vben
pnpm dev:antd
```

Visit <http://localhost:5666>.

### 5.3 Functional Testing

#### Test the List Query

1. Go to "Article Management → Article List"
2. Open the browser developer tools (F12)
3. Switch to the Network tab
4. Refresh the page and observe whether a request is sent to `/admin/v1/article`
5. Check whether the response data is correct

If you see a 401 error, the token is missing or expired; try logging in again.

If you see a 403 error, the permissions are insufficient; check whether the role has been assigned the corresponding permissions.

#### Test Creating an Article

1. Click the "Create" button
2. Fill in the form
3. Click "Submit"
4. Watch the Network tab and confirm that the POST request is sent to `/admin/v1/article`
5. Check whether the response status code is 200

#### Test Editing an Article

1. Click the "Edit" button of a record
2. Modify the form content
3. Click "Submit"
4. Watch the Network tab and confirm that the PUT request is sent to `/admin/v1/article/{id}`

#### Test Deleting an Article

1. Click the "Delete" button of a record
2. Confirm the deletion
3. Watch the Network tab and confirm that the DELETE request is sent to `/admin/v1/article/{id}`

## 6. Troubleshooting Common Issues

### 6.1 The Menu Does Not Show

**Possible causes**:
1. The menu is not configured correctly
2. The user role has not been assigned the permissions
3. The browser cache has not been cleared

**Solutions**:
1. Check whether the `menus` table in the backend database has the corresponding record
2. Check whether the `role_menus` association table is correct
3. Clear the browser cache (Ctrl + Shift + Delete)
4. Log out and log in again

### 6.2 API Requests Return 401

**Possible causes**:
1. The token is not attached
2. The token has expired
3. The token format is wrong

**Solutions**:
1. Check whether the request headers contain `Authorization: Bearer <token>`
2. Log in again to get a new token
3. Check whether the Axios interceptors are configured correctly in the frontend code

### 6.3 API Requests Return 403

**Possible causes**:
1. The user does not have the corresponding permission
2. The permission code is misconfigured
3. The authorization engine is not initialized correctly

**Solutions**:
1. Check whether the user role has been assigned the corresponding menu permissions
2. Check whether the menu's "Permission code" field matches the backend
3. Temporarily change `authz.type` to `noop` in `auth.yaml` for testing

### 6.4 API Requests Return 404

**Possible causes**:
1. The API path is wrong
2. The backend service is not running
3. The handler is not registered

**Solutions**:
1. Check whether the frontend request paths match the Protobuf definitions
2. Confirm the backend service is running
3. Check whether the corresponding handler is registered in `rest_server.go`

### 6.5 TypeScript Type Errors

**Possible causes**:
1. The latest TypeScript code has not been generated
2. IDE cache issues

**Solutions**:
1. Run `make ts` on the backend to regenerate the code
2. Restart the frontend development server
3. Restart the IDE (VSCode / WebStorm)

## 7. Debugging Tips

### 7.1 Backend Logs

The backend outputs logs to the console by default. You can get more debugging information by adjusting the log level in `logger.yaml`:

```yaml
logger:
  type: std
  zap:
    level: "debug"  # Change to debug to see more details
```

### 7.2 Frontend Debugging

In the browser developer tools:

1. **Console tab**: view JavaScript errors and console.log output
2. **Network tab**: view HTTP requests and responses
3. **Vue Devtools**: install the Vue Devtools extension to inspect component state and events

### 7.3 Swagger UI Testing

During development, prefer the Swagger UI to test the backend APIs:

1. Visit <http://localhost:7788/docs/>
2. Find ArticleService
3. Click "Authorize" and enter the token
4. Test the APIs one by one

This way you can first make sure the backend APIs work, then debug the frontend.

## 8. Performance Optimization Suggestions

### 8.1 Backend Optimization

1. **Database indexes**: add indexes for frequently queried fields
   ```sql
   CREATE INDEX idx_articles_title ON articles(title);
   CREATE INDEX idx_articles_status ON articles(status);
   ```

2. **Paginated queries**: avoid loading large amounts of data at once; always use pagination

3. **Cache hot data**: use Redis caching for frequently read data

### 8.2 Frontend Optimization

1. **Lazy-load routes**: Vben Admin enables route lazy loading by default
2. **Import components on demand**: avoid importing unused Ant Design Vue components
3. **Image compression**: compress images before uploading

## 9. Deployment Notes

### 9.1 Backend Deployment

When deploying to production:

1. Change the database address and password in `data.yaml`
2. Change the JWT secret in `auth.yaml`
3. Disable the Swagger UI (`enable_swagger: false`)
4. Enable HTTPS

### 9.2 Frontend Deployment

1. Change the API address in `.env.production` to the production address
2. Run `pnpm run build:antd` to build the production bundle
3. Deploy the `dist/` directory to Nginx or another web server

### 9.3 CORS Configuration

If the frontend and backend are deployed under different domains, configure CORS in the backend `server.yaml`:

```yaml
server:
  rest:
    cors:
      origins:
        - "https://your-frontend-domain.com"
```

## 10. Summary

In this tutorial, we completed the full full-stack integration workflow:

1. **Backend development**: Protobuf → Ent → Data → Service → Server
2. **Frontend development**: API → Composable → Page → Route
3. **Permission configuration**: menu management → role authorization
4. **Integration testing**: functional verification → troubleshooting

Once you master this workflow, you can quickly develop any new business module and ensure seamless frontend-backend integration.

## 11. Related Documentation

- [Backend Tutorial: Adding a New Business Module](/en/admin/backend-tutorial-new-module.md)
- [Frontend Tutorial: Adding a New Business Page](/en/admin/frontend-tutorial-new-page.md)
- [Backend API and Protobuf Definitions](/en/admin/backend-api.md)
- [Frontend Core Features in Detail](/en/admin/frontend-modules.md)
