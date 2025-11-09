# Temporary Notes - Known Issues

## Set Visibility Toggle Bug (Needs Reproduction)

### Description
When toggling the visibility of one generation set, other sets may revert to their old rendering appearance even though their generation configuration settings still show the updated values.

### Observed Behavior
1. Set 12 configured with new settings (grid layout, position X incremental, transform translate X)
2. Settings applied correctly and rendered as expected
3. Toggled Set 11 visibility off
4. **Bug**: Set 12 reverted to old appearance (prior settings)
5. Checked Set 12's generation configuration - still shows new settings correctly
6. Re-applied the same configuration settings
7. Set 12 rendered correctly again

### Root Cause Hypothesis
- Visibility toggle may be triggering a re-render of all enabled sets
- The re-render might be using stale/cached generation configs instead of current ones
- Possible state management issue where visibility changes cause state restoration from persistence
- May involve timing issue between state updates and render triggers

### Reproduction Steps
1. Create/edit Set 12 with specific config changes
2. Apply and verify it renders correctly
3. Toggle Set 11 visibility off
4. Observe Set 12's rendering (should revert to old appearance)
5. Check Set 12's config (should still show new settings)
6. Re-apply config (should render correctly again)

### Next Steps
- Attempt to consistently reproduce the issue
- Investigate visibility toggle handler and its effects on other sets
- Check state management flow during visibility changes
- Look for any cache/restore logic triggered by visibility toggles

### Priority
Medium - Need to reproduce consistently before investigating further

---

## Position Incremental + Grid Distribution Issues (In Progress)

### Problem
When using grid distribution with incremental position mode and modulation, the pattern breaks after the first row. Expected pattern should reset at each grid row, but currently uses shape generation index instead of grid cell index.

### Solution
Implementing modulation mode system with grid-aware calculations. See task list for full implementation plan.
