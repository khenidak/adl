import * as adltypes from '@azure-tools/adl.types'
import * as machinerytypes from '../../machinery.types'
import * as modeltypes from '../../../model/module'


export class MoveToImpl implements machinerytypes.ConversionConstraintImpl{
	private ensureObjectGraph(context: machinerytypes.ConstraintExecContext,
                              jsonPath: string,
                              rootModel: modeltypes.ApiTypeModel,
                              rootPayload:any,
							  buildIt: boolean): {outModel: modeltypes.ApiTypeModel; outPayload: any;} | undefined{

        let stepModel = rootModel;
        let stepPayload = rootPayload;

        const parts = jsonPath.split(".");

        const first = parts[0];
        if(first == `$`){ // special handling to the $ at the begining of the path
            const reminders = parts.slice(1); // cut
            const newPath = reminders.join(".");
            return this.ensureObjectGraph(context, newPath, stepModel, stepPayload, buildIt);
        }

        // define the property if it does not exist
        if(!stepPayload.hasOwnProperty(first)){
			if(!buildIt) return undefined;

            stepPayload[first] = {}; // we always assume it is nested objects
        }
        const reminders = parts.slice(1); // cut
        const newPath = reminders.join(".");
        const isLast = (reminders.length == 1);

        if(!isLast){
            // work on the rest
            stepPayload = stepPayload[first];
            stepModel = (stepModel.getProperty(first) as modeltypes.ApiTypePropertyModel).getComplexDataTypeOrThrow();
            return this.ensureObjectGraph(context, newPath, stepModel, stepPayload, buildIt);
        }
        return {
            outModel: (stepModel.getProperty(first) as modeltypes.ApiTypePropertyModel).getComplexDataTypeOrThrow(),
            outPayload: stepPayload[first],
        }
    }

 	private getPropertyNameFromPath(jpath: string): string{
        const parts = jpath.split(".");
        return parts[parts.length - 1];
    }

    ConvertToNormalized(
        context: machinerytypes.ConstraintExecContext,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
        versionName: string):{targetModel: modeltypes.ApiTypeModel,targetProperty:modeltypes.ApiTypePropertyModel, target:any} | undefined {

     	// for now we assume the path is valid, because once conformance framework is complete
        // each constraint will be validated
        const toPath = context.Constraint.Arguments[0] as string;
        const toProp = this.getPropertyNameFromPath(toPath);
        const fromProp = context.propertyName;

        context.opts.logger.verbose(`MoveTo(v=>n): toPath:${toPath} sourceProperty:${fromProp} targetProp:${toProp}`)
        const ensured  = this.ensureObjectGraph(context, toPath, rootNormalizedModel, rootNormalized, true /*build target graph */);
		if(!ensured) return undefined; // this wouldn't happen here.

        let actualleveledNormalizedModel:modeltypes.ApiTypeModel = ensured.outModel;
        let actualLevelNormalized: any = ensured.outPayload;

		// once we validate constraint itself this won't be needed
        if(!actualleveledNormalizedModel) return undefined;
        if(!actualLevelNormalized) return undefined;
		let actualProperty = actualleveledNormalizedModel.getProperty(fromProp) as modeltypes.ApiTypePropertyModel;

		 return {targetModel: actualleveledNormalizedModel, targetProperty: actualProperty, target: actualLevelNormalized};
    }

    ConvertToVersioned(
        context: machinerytypes.ConstraintExecContext,
        rootVersioned: any,
        leveledVersioned: any,
        rootNormalized: any,
        leveledNormalized: any,
        rootVersionedModel:modeltypes.ApiTypeModel,
        leveledVersionedModel:modeltypes.ApiTypeModel,
        rootNormalizedModel: modeltypes.ApiTypeModel,
        leveledNormalizedModel: modeltypes.ApiTypeModel,
       	versionName: string) : {targetModel: modeltypes.ApiTypeModel,targetProperty:modeltypes.ApiTypePropertyModel,target:any} | undefined {

		// for now we assume the path is valid, because once conformance framework is complete
        // each constraint will be validated
        const toPath = context.Constraint.Arguments[0] as string;
        const toProp = this.getPropertyNameFromPath(toPath);
        const fromProp = context.propertyName;

        context.opts.logger.verbose(`MoveTo(n=>v): toPath:${toPath} sourceProperty:${fromProp} targetProp:${toProp}`)
        const ensured  = this.ensureObjectGraph(context, toPath, rootNormalizedModel, rootNormalized, false);
		if(!ensured){
 			context.opts.logger.verbose(`MoveTo(n=>v): there is no source at this path ${toPath}`)
			 return undefined;
		}

        let actualleveledNormalizedModel:modeltypes.ApiTypeModel = ensured.outModel;
        let actualLevelNormalized: any = ensured.outPayload;

		// once we validate constraint itself this won't be needed
        if(!actualleveledNormalizedModel) return undefined;
        if(!actualLevelNormalized) return undefined;
		let actualProperty = actualleveledNormalizedModel.getProperty(fromProp) as modeltypes.ApiTypePropertyModel;

		 return {targetModel: actualleveledNormalizedModel, targetProperty: actualProperty, target: actualLevelNormalized};

    }
}
