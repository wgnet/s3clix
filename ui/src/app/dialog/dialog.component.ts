/**
 Copyright 2025 Wargaming.Net

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 **/
import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {IFile} from "../models/files.model";


@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent {

  ext = "";
  selectedItem!: IFile;
  selectedItemIndex = 0;
  previousItemIndex: number | undefined;
  nextItemIndex: number | undefined;


  constructor(public dialogRef: MatDialogRef<DialogComponent>,
              @Inject(MAT_DIALOG_DATA) public data: { elements: IFile[], index: number }) {

    this.selectByIndex(data.index);
    this.setPrevNextAvailIndex(data.index);

  }

  selectByIndex(i: number) {
    this.selectedItemIndex = i;
    this.selectedItem = this.data.elements[i];
    let pathParts = this.selectedItem.path.split('.');
    this.ext = pathParts[pathParts.length - 1];

  }

  setPrevNextAvailIndex(i: number) {
    this.nextItemIndex = this.checkAvailItemIndex(i + 1, this.data.elements, 1);
    this.previousItemIndex = this.checkAvailItemIndex(i - 1, this.data.elements, -1);
  }


  checkAvailItemIndex(index: number, data: IFile[], step: number = 1) {
    while (index < data.length && index >= 0) {

      if (!data[index].folder) {
        return index
      }
      index += step;
    }
    return
  }

  handleItemSwitching(i: number) {
    this.selectByIndex(i);
    this.setPrevNextAvailIndex(i);
  }

}
