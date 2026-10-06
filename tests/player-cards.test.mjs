import test from 'node:test';
import assert from 'node:assert/strict';
import {playerCard,cardRole} from '../player-cards.mjs';
test('card markup escapes names, identifiers and season; blanks remain placeholders',()=>{
 const html=playerCard({jugador_id:'"<>',nom:'<script>bad</script>',dorsal:'',posicio:'Unknown'},{season:'<2026>'});
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Posició pendent'));assert.ok(html.includes('Retrat pendent'));assert.ok(!html.includes('data-portrait='));assert.ok(html.includes('&lt;2026&gt;'));
});
test('only declared private portraits get a loader; role labels have a neutral fallback',()=>{
 assert.ok(playerCard({jugador_id:'j1',nom:'Prova',te_retrat:true}).includes('data-portrait="j1"'));assert.equal(cardRole('Porter'),'GK');assert.equal(cardRole('invented'),'CFV');
 const html=playerCard({nom:'El teu nom',dorsal:10,posicio:'Davanter'},{preview:true});assert.ok(html.includes('El teu retrat aquí'));assert.ok(html.includes('card-preview'));
});
