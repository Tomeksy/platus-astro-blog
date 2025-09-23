# Git Workflow

Follow these steps each time you work on the project:

1. **Create a new working branch**
   ```bash
   git checkout -b feature/<your-branch-name>
   ```

2. **Develop & test locally**
   Do your coding and run local tests until everything works.

3. **Stage your changes**
   ```bash
   git add .                # or: git add <file1> <file2>
   ```

4. **Commit your work**
   ```bash
   git commit -m "Clear, concise commit message"
   ```

5. **Push the branch to the remote**
   ```bash
   git push -u origin feature/<your-branch-name>
   ```

6. **Merge with `main`**
   • Open a Pull Request (PR) on GitHub and merge after review
   
   *–or–*
   ```bash
   # From main, fetch & merge locally
   git checkout main
   git pull origin main     # make sure main is up to date
   git merge feature/<your-branch-name>
   ```

7. **Push `main` to remote**
   ```bash
   git push origin main
   ```

8. **(Optional) Delete the branch**
   ```bash
   git branch -d feature/<your-branch-name>      # local
   git push origin --delete feature/<your-branch-name>  # remote
   ```

> Keep commit messages short and descriptive. Push only what passes local tests.
