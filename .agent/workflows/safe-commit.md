---
description: Workflow to safely commit changes by validating build and updating documentation
---

This workflow enforces the "Build -> Document -> Commit" cycle to ensure high-quality contributions.

1. **Validate Build & Tests**
   - Run the build to catch any compilation errors.
   - Run tests (if available) to ensure no regressions.
   // turbo
   ```bash
   npm run build
   ```

2. **Verify & Update Documentation**
   - Use the `quality-documentation-manager` skill to check if the README, technical docs, or inline comments need updates based on recent changes.
   - **Action:** Read the `SKILL.md` of `quality-documentation-manager` instructions if needed, but primarily:
     - Check `README.md` for consistency.
     - Check `docs/` folder if technical details changed.
   - *If documentation is outdated, update it BEFORE proceeding.*

3. **Propose Commit Message & Get Approval**
   - Analyze the changes (`git status`, `git diff`).
   - Generate a clear, conventional commit message (e.g., `feat: ...`, `fix: ...`).
   - **CRITICAL:** Present the proposed message to the user and ask: *"¿Te parece bien este mensaje de commit o quieres cambiarlo?"*
   - WAIT for the user's explicit confirmation or text modification.

4. **Stage and Commit**
   - Only after receiving user approval in Step 3.
   ```bash
   git add .
   git commit -m "Confirmed Commit Message"
   ```
