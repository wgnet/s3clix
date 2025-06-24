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

export const settings = {
  apiPrefix: 'api',
  serviceDiscoveryUrl: null,
  beSearchDebounceInterval: 400,
  minSearchTermLength: 3,
  endpoints: {
    getFilesEndpoint: 'list',
    createFolderEndpoint: 'mkdir',
    uploadFilesEndpoint: 'upload',
    getUserRolesEndpoint: 'is_admin',
    canUploadEndpoint: 'can_upload',
    canDeleteEndpoint: 'can_delete',
    deleteFileEndpoint: 'delete',
    searchFilesEndpoint: 'search',
    getBucketsEndpoint: 'buckets',
    selectBucketEndpoint: 'bucket',
    deleteFolderEndpoint: 'deleteFolder'
  },
  viewerExtensions: {
    image: ['png', 'jpeg'],
    video: ['mp4', 'ogg', 'webm'],
    pdf: ['pdf'],
    text: ['c','h', 'cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx','cs', 'js', 'ts', 'html', 'xml', 'css', 'json', 'md',
      'yaml', 'yml', 'py', 'rs', 'go', 'java', 'sql', 'sh', 'txt', 'log']
  },
  codeMirrorModes: {
    'c': 'text/x-csrc',
    'h': 'text/x-csrc',
    'cpp': 'text/x-c++src',
    'cc': 'text/x-c++src',
    'cxx': 'text/x-c++src',
    'c++': 'text/x-c++src',
    'hpp': 'text/x-c++src',
    'hh': 'text/x-c++src',
    'hxx': 'text/x-c++src',
    'cs': 'text/x-csharp',
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'html': 'text/html',
    'xml': 'application/xml',
    'css': 'text/css',
    'json': 'application/json',
    'md': 'text/x-markdown',
    'yaml': 'text/x-yaml',
    'yml': 'text/x-yaml',
    'py': 'text/x-python',
    'rs': 'text/x-rustsrc',
    'go': 'text/x-go',
    'java': 'text/x-java',
    'sql': 'text/x-sql',
    'sh': 'text/x-sh',
    'txt': 'null'
  }
};
