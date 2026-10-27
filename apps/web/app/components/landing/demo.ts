export type DemoStage='idle'|'previewing'|'awaiting-approval'|'executing'|'complete';
export type DemoEvent='preview'|'ready'|'approve'|'finish'|'reset';

export function advanceDemo(stage:DemoStage,event:DemoEvent):DemoStage {
  if(event==='reset')return 'idle';
  if(stage==='idle'&&event==='preview')return 'previewing';
  if(stage==='previewing'&&event==='ready')return 'awaiting-approval';
  if(stage==='awaiting-approval'&&event==='approve')return 'executing';
  if(stage==='executing'&&event==='finish')return 'complete';
  return stage;
}

export function projectSavings({monthlyMinor,months,targetMinor,extraMinor}:{monthlyMinor:number;months:number;targetMinor:number;extraMinor:number}) {
  if(![monthlyMinor,months,targetMinor,extraMinor].every(value=>Number.isSafeInteger(value)&&value>=0)||targetMinor===0)throw new RangeError('Demo values must be non-negative whole minor units and the goal must be positive.');
  const target=BigInt(targetMinor),monthly=BigInt(monthlyMinor),extra=BigInt(extraMinor);
  const projected=monthly*BigInt(months)+extra;
  const saved=projected>target?target:projected;
  const leftToFund=target>extra?target-extra:0n;
  return {savedMinor:Number(saved),remainingMinor:Number(target-saved),percent:Number(saved*100n/target),monthsToGoal:leftToFund===0n?0:monthly===0n?null:Number((leftToFund+monthly-1n)/monthly)};
}
