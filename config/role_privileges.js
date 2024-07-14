module.exports = {
    privGroups: [
        {
            id: "USERS",
            name: "User Permissions"
        },
        {
            id: "ROLES",
            name: "Role Permissions"
        },
        {
            id: "CATEGORIES",
            name: "Category Permissions"
        },
        {
            id: "AUDITLOGS",
            name: "AuditLog Permissions"
        },
    ],
    priviligies: [
        // User Permissions
        {
            key: "user_view",
            name: "User View",
            group: "USERS",
            desc: "View user details",
        },
        {
            key: "user_add",
            name: "User Add",
            group: "USERS",
            desc: "Add new user",
        },
        {
            key: "user_update",
            name: "User Update",
            group: "USERS",
            desc: "Update user details",
        },
        {
            key: "user_delete",
            name: "User Delete",
            group: "USERS",
            desc: "Delete user",
        },
        // Role Permissions
        {
            key: "role_view",
            name: "Role View",
            group: "ROLES",
            desc: "View roles",
        },
        {
            key: "role_add",
            name: "Role Add",
            group: "ROLES",
            desc: "Add new role",
        },
        {
            key: "role_update",
            name: "Role Update",
            group: "ROLES",
            desc: "Update role details",
        },
        {
            key: "role_delete",
            name: "Role Delete",
            group: "ROLES",
            desc: "Delete role",
        },
        // Category Permissions
        {
            key: "category_view",
            name: "Category View",
            group: "CATEGORIES",
            desc: "View categories",
        },
        {
            key: "category_add",
            name: "Category Add",
            group: "CATEGORIES",
            desc: "Add new category",
        },
        {
            key: "category_update",
            name: "Category Update",
            group: "CATEGORIES",
            desc: "Update category details",
        },
        {
            key: "category_delete",
            name: "Category Delete",
            group: "CATEGORIES",
            desc: "Delete category",
        },
        // AuditLog Permissions
        {
            key: "auditlogs_view",
            name: "AuditLog View",
            group: "AUDITLOGS",
            desc: "View audit logs",
        },
    ]
}
