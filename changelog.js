// Keep newest entries first. Move Unreleased notes into a numbered entry when shipping.
var WeBWorKerChangelog = [
    {
        version: 'Unreleased',
        changes: [
            'Added optional Study Mode to hide previous answers, feedback, grades, and solutions.',
            'Added nested variable expressions, cycle detection, and safer expansion.',
            'Fixed screenshot scrolling and capture of long questions.',
            'Updated onboarding, the popup, and calculator tools to match WeBWorK.',
            'Added Wolfram Alpha queries to the calculator sidebar.'
        ]
    },
    {
        version: '2.2.0',
        changes: ['Moved Desmos Scientific and Graphing into Chrome’s side panel.']
    },
    {
        version: '2.1.1',
        changes: ['Added controls to disable and re-enable individually detected variables.']
    }
];
