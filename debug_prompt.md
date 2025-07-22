# 🔍 Working Setup Analysis Prompt

**Copy and paste this ENTIRE prompt into your working web app's Cursor IDE AI:**

---

I have a web app that's currently working perfectly with GitHub commits and Vercel deployments. I need you to help me extract ALL the configuration details so I can compare it to another project that's having deployment issues.

Please run these commands and analyze the configuration:

## 1. Git Configuration Analysis
```bash
# Show current Git user configuration
git config --list | grep user

# Show the last 5 commits with detailed author info
git log --pretty=format:"%h %an %ae %s" -5

# Show remote repository URL
git remote -v

# Show current branch and tracking info
git status
git branch -vv
```

## 2. GitHub Integration Check
Please tell me:
- What GitHub username owns this repository?
- What email addresses are associated with the commits?
- What's the full repository URL?

## 3. Vercel Configuration
If this project is deployed on Vercel, please check:
- What email is used for the Vercel account?
- How is the GitHub integration set up?
- Are there any special deployment configurations?

## 4. Project Structure
```bash
# Show project files and any deployment config
ls -la
cat package.json 2>/dev/null || echo "No package.json found"
cat vercel.json 2>/dev/null || echo "No vercel.json found"
cat .gitignore 2>/dev/null || echo "No .gitignore found"
```

## 5. Account Consistency Check
Please help me understand:
- **Git commit author email**: What email appears in `git log`?
- **GitHub account email**: What email is associated with the GitHub account?
- **Vercel account email**: What email is used for the Vercel account?
- **Are all three emails the same or different?**

## 6. Deployment History
If possible, check:
- When was the last successful deployment?
- Are there any recent changes to Git or Vercel settings?
- How are commits currently triggering deployments?

## 7. System Environment
```bash
# Show system user info
whoami
git config --global --list | grep user 2>/dev/null || echo "No global git config"
```

## Summary Request
Based on all this information, please provide:

1. **Email Configuration Summary**: List all emails being used (Git, GitHub, Vercel)
2. **Working Flow**: Describe the exact flow from `git push` to Vercel deployment
3. **Key Settings**: Any critical configuration that makes this work
4. **Potential Differences**: What might be different from a standard setup

This information will help me fix a similar project that's getting "Git author must have access to the project on Vercel" errors.

---

**End of prompt - paste everything above this line into your working app's Cursor AI** 