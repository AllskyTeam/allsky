# Contributing

Contributions to Allsky are welcome, whether they are fixes, new features, documentation improvements, UI work, module development, refactoring, or test coverage. This page is aimed at developers and assumes you are comfortable working with Git, branches, and pull requests.

Allsky development is split across two GitHub repositories, and choosing the correct one is the first step in making a contribution.

!!! info "The two main repositories"

    **`allsky`**

    :   The core Allsky project. This includes the main capture pipeline, WebUI, server-side logic, installer, documentation, built-in functionality, and the core module framework.

    **`allsky-modules`**

    :   The additional modules repository. This is where extra modules live, including optional integrations, sensors, external services, processing helpers, automation modules, and other add-on functionality that is not part of the main core tree.

If your change modifies the main application, installer, WebUI, documentation, or the module framework itself, it almost certainly belongs in `allsky`.

If your change adds or modifies an extra module, it almost certainly belongs in `allsky-modules`.

### Choosing The Correct Repository { data-toc-label="Choosing Correct" }

Before you write code, decide where the contribution should land. This matters because a change that is correct in one repository may be awkward, out of scope, or unmergeable in the other.

=== "Use `allsky` when"

    - You are changing core application behaviour.
    - You are modifying the WebUI.
    - You are working on installation or upgrade logic.
    - You are changing the module manager, module runtime, module SDK, or shared infrastructure.
    - You are updating the main documentation set.
    - You are fixing bugs in the main capture, processing, or service stack.

=== "Use `allsky-modules` when"

    - You are adding a new extra module.
    - You are fixing an existing extra module.
    - You are updating module-specific metadata, behaviour, or bundled assets for an extra module.
    - You are contributing an integration that is optional and does not need to live in the core project.

!!! tip

    If a change requires modifications in both repositories, treat them as two separate contributions and prepare two pull requests. That keeps review cleaner and avoids coupling unrelated histories together.

### Recommended Workflow { data-toc-label="Recommended Workflow" }

The recommended workflow is the standard fork-and-branch model used on GitHub. In practice, this means:

1. Fork the repository you want to contribute to.
2. Clone your fork locally.
3. Add the upstream AllskyTeam repository as a second remote.
4. Create a short-lived branch for one specific piece of work.
5. Commit logically grouped changes.
6. Push the branch to your fork.
7. Open a pull request back to the upstream repository.

This workflow keeps your `main` branch clean, makes it easy to sync with the upstream project, and helps reviewers understand exactly what your branch is trying to do.

### Fork And Clone { data-toc-label="Fork And Clone" }

Start by forking the relevant repository on GitHub. Once that is done, clone your fork locally.

=== "Clone `allsky`"

    ```bash
    git clone https://github.com/<your-github-user>/allsky.git
    cd allsky
    ```

=== "Clone `allsky-modules`"

    ```bash
    git clone https://github.com/<your-github-user>/allsky-modules.git
    cd allsky-modules
    ```

Then add the upstream remote:

=== "Add upstream for `allsky`"

    ```bash
    git remote add upstream https://github.com/AllskyTeam/allsky.git
    git remote -v
    ```

=== "Add upstream for `allsky-modules`"

    ```bash
    git remote add upstream https://github.com/AllskyTeam/allsky-modules.git
    git remote -v
    ```

The `origin` remote should point to your fork. The `upstream` remote should point to the AllskyTeam repository.

### Keep `main` Clean { data-toc-label="Keep main Clean" }

Your local `main` branch should be treated as a clean tracking branch, not as a development branch. That is one of the simplest habits that prevents unnecessary Git pain later.

Before creating a new feature or fix branch, sync `main` with upstream:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

If you prefer rebasing over merging for your personal workflow, that is fine, but the key point is the same: start new work from a current `main`.

!!! warning "Do not stack unrelated work in one branch"

    A branch should represent one focused change set. If you fix three unrelated issues in one branch because they happen to touch similar files, review becomes harder, testing becomes less clear, and the chance of the whole branch being delayed goes up.

### Create A Branch { data-toc-label="Create A Branch" }

Create a dedicated branch for the work you are about to do. Branch names do not need to be elaborate, but they should tell reviewers what the branch is for.

Examples:

```bash
git checkout -b fix/liveview-refresh
git checkout -b feature/module-changelog-modal
git checkout -b docs/contributing-guide
git checkout -b module/add-weather-underground
```

Short-lived, focused branches are strongly preferred over long-running personal integration branches.

### Do The Work { data-toc-label="Do The Work" }

Once the branch exists, make your changes. Keep the scope tight. A good contribution branch usually has one clear purpose:

- one bug fix,
- one feature,
- one refactor,
- one documentation improvement,
- or one new module.

If you realise halfway through that you are solving a second problem, it is often better to finish the first branch and create a second one for the new work.

For larger changes, it is good practice to make several small commits rather than one huge undifferentiated commit. That said, the commit history should still be coherent. Reviewers should be able to see the logic of the change rather than a stream of random checkpoint commits.

### Code And Documentation Expectations { data-toc-label="Code Documentation" }

Allsky spans shell, Python, PHP, JavaScript, HTML, CSS, and documentation. The exact standards differ by area, but some general expectations apply everywhere.

/// details | General expectations

- Keep changes focused and technically defensible.
- Prefer clear, explicit code over clever code.
- Do not mix broad formatting churn with behavioural changes unless there is a strong reason.
- Update documentation when user-visible behaviour changes.
- If you add configuration, think about defaults, validation, and upgrade impact.
- If you change UI behaviour, think about both desktop and mobile usage.

///

/// details | Python and scripting

- Follow existing project style in the area you are editing.
- Use meaningful names and avoid opaque helper layers unless they clearly improve the design.
- Validate inputs and error paths, especially for module code and integration points.
- Run `shellcheck` on shell scripts where appropriate.

///

/// details | WebUI and frontend work

- Keep behaviour consistent with existing UI patterns unless the change is intentionally redesigning something.
- Test interactive changes in the browser where possible.
- Include screenshots or short video captures in the pull request for meaningful UI changes.

///

/// details | Documentation

- Keep docs aligned with actual behaviour, not intended behaviour.
- Prefer complete explanations over terse notes when the topic is user-facing or operational.
- If a feature, workflow, or page changes, update the relevant guide at the same time.

///

### Test Before You Push { data-toc-label="Test Before You Push" }

You do not need a perfect enterprise test matrix for every contribution, but you do need to verify your work sensibly. The right checks depend on the type of change.

=== "`allsky` contributions"

    Typical checks may include:

    - verifying the affected page or workflow in the WebUI,
    - running relevant syntax checks,
    - testing installer or upgrade behaviour if touched,
    - checking service startup if capture or runtime logic changed,
    - confirming that documentation still builds correctly if docs changed.

=== "`allsky-modules` contributions"

    Typical checks may include:

    - testing the affected module directly,
    - verifying metadata and module manager visibility,
    - checking logs and runtime behaviour,
    - confirming that any generated extra data or UI integration behaves correctly.

If you could not test something important, say so explicitly in the pull request. Reviewers are much more tolerant of a clearly stated testing limitation than of silent assumptions.

!!! note

    “It should work” is not testing. Even for documentation-only changes, it is worth checking that formatting, links, and code fences render correctly.

### Commit Your Changes { data-toc-label="Commit Your Changes" }

Commit messages should be clear and purposeful. Reviewers should be able to understand what happened from the log without opening every diff immediately.

Good examples:

```text
docs: rewrite developer contributing guide
modules: add changelog button to package manager
liveview: fix stale refresh timing after day/night transition
backup: improve restore modal messaging
```

Less good examples are messages like `updates`, `fix stuff`, or `more changes`, because they say almost nothing about the actual contribution.

Once you are ready:

```bash
git status
git add <files>
git commit -m "docs: rewrite developer contributing guide"
```

### Push Your Branch { data-toc-label="Push Your Branch" }

Push the branch to your fork:

```bash
git push -u origin docs/contributing-guide
```

The `-u` flag sets the upstream tracking branch so later pushes can usually be done with a plain `git push`.

### Open A Pull Request { data-toc-label="Open A Pull Request" }

Open a pull request from your forked branch to the appropriate upstream repository.

Your pull request should explain:

- what the change does,
- why the change is needed,
- which repository it belongs to,
- how you tested it,
- and any follow-up context reviewers should know.

For UI changes, include screenshots. For behavioural changes, include enough explanation that the reviewer can understand the intended outcome without reconstructing it entirely from the diff.

/// details | A good pull request description usually includes

- a short summary,
- the motivation or problem statement,
- notes on implementation decisions if they are not obvious,
- testing performed,
- screenshots or recordings for UI work,
- and any known limitations.

///

### Keep Your Branch Up To Date { data-toc-label="Keep Branch Date" }

If `main` moves on while your pull request is open, update your branch from upstream rather than letting it drift too far behind.

A simple merge-based update looks like this:

```bash
git checkout main
git fetch upstream
git merge upstream/main
git checkout your-branch-name
git merge main
```

Then push the updated branch again.

If you are comfortable with rebasing and prefer a cleaner history on your own fork, you can rebase instead, but do so carefully once a pull request is already under review. Reviewers generally care more about a stable, understandable branch than about a perfectly minimal commit graph.

### Contributing To `allsky-modules` { data-toc-label="Contributing To" }

The modules repository deserves a few additional points because modules are often contributed independently of core work.

When contributing to `allsky-modules`, keep the module self-contained. A module contribution should include everything needed for that module to be usable and maintainable:

- the module code,
- complete metadata,
- sensible defaults,
- changelog entries where required by the module format,
- documentation if the module is user-facing,
- and any assets the module actually depends on.

Do not rely on undocumented assumptions. If the module expects hardware, a service, credentials, or an external API, make that clear in the code and in the documentation. Optional integrations are fine, but hidden requirements are not.

!!! tip "Think about maintainability"

    Extra modules often outlive the original contributor’s immediate interest. A module that is easy to understand, clearly documented, and explicit about its dependencies is much easier for the project to keep healthy over time.

### Contributing To `allsky` { data-toc-label="Contributing To allsky" }

Core contributions deserve extra caution because changes here can affect installation, upgrades, runtime behaviour, and the user interface for a wide range of systems.

If you are changing core behaviour:

- consider upgrade impact,
- consider configuration compatibility,
- consider whether existing users will see changed behaviour immediately,
- and consider whether documentation or migration notes are needed.

Even small changes in the core project can have wider effects than they first appear. This does not mean core changes should be avoided. It means they should be made carefully and with the broader system in mind.

### Documentation-Only Contributions { data-toc-label="Documentation-Only" }

Documentation contributions are valuable and welcome. They do not need to be bundled with code changes to be worthwhile. If you find something unclear, outdated, misleading, incomplete, or awkwardly explained, it is entirely reasonable to submit a docs-only pull request.

In fact, focused documentation pull requests are often easier to review and merge than mixed code-and-doc changes where the documentation gets buried inside a larger feature branch.

### Security Issues { data-toc-label="Security Issues" }

Do not open a public issue or public pull request for an undisclosed security vulnerability. Report security-sensitive problems privately to the project maintainers using the project’s preferred security reporting route.

### Final Advice { data-toc-label="Final Advice" }

The easiest contributions to review and merge are usually the ones with the clearest boundaries. Pick the right repository, start from an up-to-date `main`, create a focused branch, test what you changed, and explain your work clearly in the pull request.

That workflow is not bureaucratic overhead. It is what keeps contributions understandable, reviewable, and maintainable across both `allsky` and `allsky-modules`.
