# GitHub Actions Deployment Setup

To enable automated deployment, you need to add the following secrets to your GitHub repository under **Settings > Secrets and variables > Actions**.

### Required Secrets

| Secret Name | Description | Recommended Value (copy from terminal) |
| :--- | :--- | :--- |
| `SERVER_IP` | The public IP address of your deployment server. | (Your server IP) |
| `SERVER_USER` | The SSH username (e.g., `root`, `ubuntu`, `deploy`). | (Your server username) |
| `SSH_PRIVATE_KEY` | Your private SSH key. | Content of `~/.ssh/kiduka_deploy` |

### How to get your keys:
Run these commands in your terminal on your Mac:

- **For GitHub SSH_PRIVATE_KEY**: `cat ~/.ssh/kiduka_deploy`
- **For Server Provider (Public Key)**: `cat ~/.ssh/kiduka_deploy.pub`

### Optional Secrets

| Secret Name | Description | Default |
| :--- | :--- | :--- |
| `SSH_PORT` | The SSH port if your server doesn't use the standard port 22. | 22 |

> [!TIP]
> **Project Path**: The workflow assumes your project is located at `~/Kiduka` or `/var/www/Kiduka` on the server. If it's somewhere else, you'll need to update the `cd` command in [.github/workflows/deploy.yml](file:///Users/a1989/Desktop/dev/Kiduka/.github/workflows/deploy.yml).

### How to add secrets:
1. Go to your repository on GitHub.
2. Click on **Settings**.
3. In the left sidebar, click on **Secrets and variables > Actions**.
4. Click on **New repository secret**.
5. Add each secret name and its value.

> [!IMPORTANT]
> Make sure the `SERVER_USER` has permissions to run Docker commands without `sudo`, or your `deploy.sh` script handles `sudo` correctly (which it currently does).
