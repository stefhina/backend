import { model } from 'mongoose';
import Form from '../models/form';
import { IFormDocument } from '../models/form/type';
import { fieldsToMongooseSchema } from '../lib/parser';
import { throwDuplicate } from '../lib/error';

export const recordModels = {};

class FormService {
  private updatables = [];

  createForm = async (data: Record<string, any>): Promise<IFormDocument> => {
    try {
      const form = await new Form(data).save();
      /**
       * Schema for the form record.
       * It can be used to create the curresponding model
       * for managing CRUD for the form record.
       */
      const { schema, updatables } = fieldsToMongooseSchema(form.fields);

      const id = form._id.toString();

      recordModels[id] = model(`record-${id}`, schema, `record-${id}`);
      this.updatables = updatables;

      return form;
    } catch (err) {
      throwDuplicate(err);
    }
  };

  getForm = async (
    projectId: string,
    formId: string
  ): Promise<IFormDocument> => {
    const form = await Form.findOne({ project: projectId, _id: formId });

    if (!form) {
      throw new Error();
    }

    return form;
  };

  getForms = async (projectId: string): Promise<IFormDocument[]> => {
    return await Form.find({ project: projectId });
  };

  updateForm = async (
    projectId: string,
    formId: string,
    newData: Record<string, any>
  ): Promise<IFormDocument> => {
    const updatables = ['name', 'description', 'fields'];
    try {
      const form = await Form.findOne({ project: projectId, _id: formId });

      updatables.forEach((key) => {
        if (newData[key] != undefined) {
          form[key] = newData[key];
        }
      });

      return await form.save();
    } catch (err) {
      if (err.code === 11000) {
        throwDuplicate(err);
      } else {
        throw new Error();
      }
    }
  };

  deleteForm = async (
    projectId: string,
    formId: string
  ): Promise<IFormDocument> => {
    const form = await Form.findOneAndDelete({
      project: projectId,
      _id: formId,
    });

    if (!form) {
      throw new Error();
    }

    return form;
  };

  deleteForms = async (projectId: string): Promise<Record<string, any>> => {
    const forms = await Form.find({ project: projectId });

    await Form.deleteMany({ project: projectId });

    return forms;
  };

  createRecord = async (
    formId: string,
    data: Record<string, any>
  ): Promise<Record<string, any>> => {
    const Record = recordModels[formId];

    return await new Record({
      ...data,
      form: formId,
    }).save();
  };

  getRecord = async (
    formId: string,
    recordId: string
  ): Promise<Record<string, any>> => {
    const Record = recordModels[formId];
    const record = await Record.findOne({ form: formId, _id: recordId });

    if (!record) {
      throw new Error();
    }

    return record;
  };

  getRecords = async (formId: string): Promise<Record<string, any>[]> => {
    const Record = recordModels[formId];

    return await Record.find();
  };

  updateRecord = async (
    formId: string,
    recordId: string,
    newData: Record<string, any>
  ): Promise<Record<string, any>> => {
    const Record = recordModels[formId];
    const record = await Record.findOne({
      form: formId,
      _id: recordId,
    });

    if (!record) {
      throw new Error();
    }

    this.updatables.forEach((key) => {
      if (newData[key] != undefined) {
        record[key] = newData[key];
      }
    });

    return await record.save();
  };

  deleteRecord = async (
    formId: string,
    recordId: string
  ): Promise<Record<string, any>> => {
    const Record = recordModels[formId];
    const record = await Record.findOneAndDelete({
      form: formId,
      _id: recordId,
    });

    if (!record) {
      throw new Error();
    }

    return record;
  };

  deleteRecords = async (formId: string): Promise<boolean> => {
    try {
      await Form.db.dropCollection(`record-${formId}`);

      return true;
    } catch (err) {
      return false;
    }
  };
}

export default new FormService();
