# PSScriptAnalyzerSettings.psd1
# Reglas de PSScriptAnalyzer para el repo. Lo usan tools/check.ps1 y el CI.
# Se parte de las reglas por defecto y se excluyen solo las que violamos a
# proposito, cada una con su motivo.
@{
    ExcludeRules = @(
        # Los .ps1 son instaladores interactivos: Write-Host es salida CON COLOR
        # para el usuario, no datos de pipeline. Es el uso correcto aqui.
        'PSAvoidUsingWriteHost',

        # Los scripts implementan su propio -DryRun; no necesitan ShouldProcess
        # (-WhatIf) en cada funcion helper interna.
        'PSUseShouldProcessForStateChangingFunctions',

        # Falso positivo con comandos nativos (npm, pnpm), que si usan posicionales.
        'PSAvoidUsingPositionalParameters',

        # Falso positivo: $DryRun es un switch a nivel de script usado dentro de las
        # funciones por alcance dinamico; el analizador no lo reconoce como usado.
        'PSReviewUnusedParameter',

        # Idiom oficial de oh-my-posh en el perfil: 'oh-my-posh init ... | iex'.
        # La entrada es la salida confiable de oh-my-posh, no input del usuario.
        'PSAvoidUsingInvokeExpression'
    )
}
