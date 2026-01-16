# How to Push to GitHub

You are currently on a local branch with uncommitted changes. To push your work to GitHub, follow these steps.

## Step 1: Commit Your Changes
You have valuable changes (TypeScript fixes, file organization, etc.) that need to be saved.

Run these commands in your terminal:

```bash
# 1. Stage all changes (modifications, deletions, and new files)
git add .

# 2. Commit the changes
git commit -m "refactor: resolve all TypeScript errors and organize docs"
```

## Step 2: Create a Repository on GitHub
1.  Go to [GitHub.com](https://github.com) and sign in.
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name it `PrepMaster` (or your preferred name).
4.  **Do not** initialize with README, .gitignore, or License (you already have these).
5.  Click **Create repository**.

## Step 3: Link and Push
Once created, GitHub will show you a "Quick setup" page. Copy the URL (e.g., `https://github.com/username/PrepMaster.git`).

Run these commands in your terminal (replace `YOUR_REPO_URL` with the actual link):

```bash
# 1. Rename the default branch to main (if not already)
git branch -M main

# 2. Add the remote repository
git remote add origin YOUR_REPO_URL

# 3. Push your code
git push -u origin main
```

## Verification
After pushing, refresh your GitHub repository page. You should see all your files, including the new `DOT MD FILES` folder and the clean code.
