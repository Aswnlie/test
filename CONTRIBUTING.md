# Team Git Workflow

1. **Never work directly on `main`.** Create your own branch:
   `git checkout -b feature/your-name-task` (e.g. `feature/anna-contact-page`)
2. **Pull before you start:** `git pull origin main`
3. **Commit small and often** with clear messages:
   `git commit -m "Add contact form to contact.html"`
4. **Push your branch:** `git push origin feature/your-name-task`
5. **Open a Pull Request** on GitHub. The Team Lead reviews and merges.
6. **Avoid editing the same file at the same time.** Check the roles table in the README.

## Naming Rules
- Lowercase with hyphens: `hero-banner.jpg`, `about-us.html`
- No spaces or capital letters in file names.
