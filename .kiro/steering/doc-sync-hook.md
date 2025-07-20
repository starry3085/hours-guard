# Documentation Sync Hook

## Hook Configuration
```json
{
  "name": "Documentation Sync",
  "description": "Updates related documentation when code changes are detected",
  "events": ["onSave"],
  "filePatterns": ["miniprogram/**/*.js", "miniprogram/**/*.wxml", "miniprogram/**/*.wxss", "miniprogram/**/*.json"],
  "excludePatterns": ["**/node_modules/**"],
  "runMode": "manual"
}
```

## Hook Instructions

When code is modified, especially when functionality details change, this hook will:

1. Identify the changed files and their functionality
2. Find all related documentation files that might need updates
3. Update the documentation to reflect the code changes
4. Ensure consistency between code implementation and documentation

### Documentation Files to Check

- README.md files
- ADAPTATION_GUIDE.md and ADAPTATION_SUMMARY.md
- icon-design-spec.md
- Any markdown files in the project root
- Comments in related code files

### Update Process

1. Analyze the code changes to understand what functionality has changed
2. Identify which documentation files need to be updated based on the changes
3. Make precise updates to the documentation to reflect the new functionality
4. Maintain the existing documentation style and format
5. Add appropriate version notes if the change is significant

### Example Scenarios

- If a new UI component is added, update the relevant design documentation
- If API usage changes, update the corresponding API documentation
- If data storage methods change, update storage-related documentation
- If screen adaptation logic changes, update the adaptation guide