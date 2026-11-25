# PSScriptAnalyzer rules for the repo, used by tools/check.ps1 and CI. It starts from the default
# rules and excludes only the ones the scripts break on purpose, each with its reason.
@{
    ExcludeRules = @(
        # The .ps1 files are interactive installers: Write-Host is COLORED output for the user,
        # not pipeline data. That is the right use here.
        'PSAvoidUsingWriteHost',

        # The scripts implement their own -DryRun; internal helpers do not need ShouldProcess
        # (-WhatIf) each.
        'PSUseShouldProcessForStateChangingFunctions',

        # False positive with native commands (npm, pnpm), which do use positional arguments.
        'PSAvoidUsingPositionalParameters',

        # False positive: $DryRun is a script-level switch used inside the functions through
        # dynamic scope; the analyzer does not see it as used.
        'PSReviewUnusedParameter',

        # oh-my-posh's official idiom in the profile: 'oh-my-posh init ... | iex'. The input is
        # oh-my-posh's trusted output, not user input.
        'PSAvoidUsingInvokeExpression'
    )
}
