# Publish Checkstyle Report

![Build status](https://img.shields.io/github/actions/workflow/status/Juuxel/publish-checkstyle-report/build.yml?branch=main&style=flat-square)
![License](https://img.shields.io/github/license/Juuxel/publish-checkstyle-report?style=flat-square)
![Version](https://img.shields.io/github/v/tag/Juuxel/publish-checkstyle-report?style=flat-square)

An action that displays [Checkstyle](https://checkstyle.org/) errors as inline code annotations.

![Example error screenshot](example.png)

## Usage

After the workflow step that runs Checkstyle and produces the report XML files, add this action:

```yaml
- name: Publish Checkstyle report
  uses: Juuxel/publish-checkstyle-report@v2
  if: ${{ failure() || success() }}
  with:
    # required: The glob paths to report XML files as a multiline string
    # The format below works for the Gradle Checkstyle plugin with default configurations
    reports: |
      build/reports/checkstyle/*.xml
```

> You can replace `failure() || success()` with just `failure()` if you only want the annotations to appear
> when the build has failed.
