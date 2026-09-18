import assert from 'node:assert/strict';

export async function checkSavedStateSecurity({connection,evaluate,waitFor}) {
  // Corrupt only the isolated test profile; restore the genuine run afterwards.
  await evaluate('window.securityBackup = localStorage.getItem("titravelle-science-lab-v2")');
  const backup = await evaluate('window.securityBackup');
  try {
    for (const target of ['trial', 'draft']) {
      await connection('Runtime.callFunctionOn', {
        functionDeclaration: `function(target, backup) {
          const state = JSON.parse(backup);
          const markup = '<i data-security-probe="injected">Untrusted markup</i>';
          if (target === 'trial') state.vessels.flask.trial = markup;
          else state.draft[markup] = 'Unexpected field';
          localStorage.setItem('titravelle-science-lab-v2', JSON.stringify(state));
        }`,
        objectId: (await connection('Runtime.evaluate', {expression:'globalThis'})).result.objectId,
        arguments: [{value:target},{value:backup}],
      });
      await connection('Page.reload');await waitFor('.sl-reagent');
      assert.equal(await evaluate('document.querySelectorAll("[data-security-probe]").length'),0);
      assert.equal(await evaluate('JSON.parse(localStorage.getItem("titravelle-science-lab-v2")).vessels.flask.trial'),0);
    }
  } finally {
    await connection('Runtime.callFunctionOn', {
      functionDeclaration: 'function(backup) { localStorage.setItem("titravelle-science-lab-v2", backup); }',
      objectId: (await connection('Runtime.evaluate', {expression:'globalThis'})).result.objectId,
      arguments: [{value:backup}],
    });
    await connection('Page.reload');await waitFor('.sl-reagent');
  }
  console.log('PASS: malformed saved trial counters and notebook field names cannot inject HTML; existing run restored');
}
