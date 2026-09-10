# Contributors management

Work branch for Superhuman's hub-and-spoke contributor model.

Current circles (already in the spine):

- Family
- Friends
- Co-workers
- Advisors: coaches, trainers, nutritionists, doctors, accountants

Invite channels: WhatsApp and email.

This branch is for:

1. A dedicated contributors screen (list, invite, revoke, preview as)
2. Per-person scope editor (tab × view/edit/admin, health slice)
3. Accept-invite flow (`?invite=`)
4. Persistence of people + scopes in the local store
5. Tests for RBAC (`canAct`, `visibleTabs`, `healthFilter`)

Do not leak one contributor's view to another. Timeline remains the only cross-module contract.
