# How to Log In to GitHub

Since you have Homebrew installed, there are two ways to log in.

## Option 1: The Easy Way (Recommended)
This method installs the official GitHub CLI tool, which lets you log in via your browser.

1.  **Install GitHub CLI**:
    Copy and run this command in your terminal:
    ```bash
    brew install gh
    ```

2.  **Log In**:
    Run this command and follow the interactive prompts:
    ```bash
    gh auth login
    ```
    *   Select `GitHub.com`
    *   Select `SSH` (recommended) or `HTTPS`
    *   Select `Login with a web browser`
    *   Copy the one-time code shown in the terminal, paste it into the browser window that opens, and authorize.

3.  **Configure Git Identity**:
    If you haven't already, tell git who you are (this attaches your name to your commits):
    ```bash
    git config --global user.name "Your Name"
    git config --global user.email "your.email@example.com"
    ```

## Option 2: The Manual Way (Personal Access Token)
If you prefer not to install new tools, you must use a "Personal Access Token" instead of your password.

1.  **Generate Token**:
    *   Go to GitHub.com > Settings > Developer settings > Personal access tokens > Tokens (classic).
    *   Click **Generate new token (classic)**.
    *   Select scopes: `repo` (minimum).
    *   Generate and **COPY** the token (it won't be shown again).

2.  **Use Token**:
    *   When you run `git push`, you will be asked for a username and password.
    *   **Username**: Your GitHub username.
    *   **Password**: Paste the **Token** you just copied (NOT your account password).
