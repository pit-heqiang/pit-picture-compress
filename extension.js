const vscode = require('vscode');
const path = require('path');
const webp = require('webp-converter');
const fs = require('fs');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	let compressFolder = vscode.commands.registerCommand('pit-picture-compress.compressFolder', function (folder) {
		const pictureConfig = vscode.workspace.getConfiguration().get('pit-picture-compress.pictureCompressConfig') || {};
		// 需要压缩的文件夹路径
		const folderPath = slicePath(folder.path);
		// 压缩文件夹名称
		const outputFolder = `compress-output`;
		// 压缩文件夹的路径
		const outputFolderUrl = `${folderPath}/${outputFolder}`;
		// 判断文件夹是否存在 存在就先删除
		delOutputFolder(outputFolderUrl);

		vscode.workspace.
			findFiles(new vscode.RelativePattern(
				folder.fsPath,
				`**/*.{png,jpg,jpeg}`
			))
			.then((files) => {
				if (!files.length) {
					return vscode.window.showInformationMessage('文件夹下没有图片');
				}
				let filterData = files.filter(item => {
					let size = getFileSize(slicePath(item.path));
					// KB 转 MB
					size = size / 1024 / 1024;
					return size < pictureConfig.maxSize && size > pictureConfig.minSize;
				})
				// 新建压缩文件夹
				fs.mkdirSync(outputFolderUrl);

				//保留所有新建的文件夹路径
				const newFolderArr = [];

				// 获取压缩图片
				const compressedPicture = getCompressedPicture(filterData.length);
				filterData.forEach((file) => {
					// 图片地址
					const filePath = slicePath(file.path);
					// 图片名称
					const fileName = path.basename(file.path);

					// 判断当前图片是否在子文件夹下面
					const folderNameArr = getFolderUrl(slicePath(file.path), folderPath, fileName);

					// 不在子文件下面直接压缩
					if (!folderNameArr.length) {
						compressedPicture(filePath, `${outputFolderUrl}/${fileName}`, files);
					} else {
						// 需要创建的文件夹路径
						let newFolderPath = outputFolderUrl;

						// 处理多层目录的情况 
						folderNameArr.map(v => {
							newFolderPath = `${newFolderPath}/${v}`;

							// 判断目录是否存在 不存在就先新建目录在把图片压缩进去
							if (!newFolderArr.includes(newFolderPath) && !fs.existsSync(newFolderPath)) {
								newFolderArr.push(newFolderPath);
								fs.mkdirSync(newFolderPath);
							}
						});
						compressedPicture(filePath, `${newFolderPath}/${fileName}`, files);
					}
				})
			});
	});
	context.subscriptions.push(compressFolder);
}

/**
 * 删除非空文件夹
 * @param {*} path 
 */
const delOutputFolder = (path) => {
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file) {
			var curPath = path + "/" + file;
			if (fs.statSync(curPath).isDirectory()) { // recurse
				delOutputFolder(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

/**
 * 压缩图片
 * @param {*} path 
 * @param {*} outputPath 
 */

const getCompressedPicture = (compressCount) => {
	const pictureConfig = vscode.workspace.getConfiguration().get('pit-picture-compress.pictureCompressConfig') || {};
	let count = 0;
	let success = 0;
	let fail = 0;
	return (path, outputPath) => {
		if (!path || !outputPath) {
			return
		}
		try {
			const result = webp.cwebp(path, outputPath, `-q ${pictureConfig.compressionRatio}`);
			result.then((response) => {
				count++;
				response ? fail++ : success++;
				count == compressCount && vscode.window.showInformationMessage(`压缩完成：【总数：${compressCount}，成功：${success}，失败：${fail}】`);
			});
		} catch (error) {
			count++;
		}
	}
}

/**
 * 获取路径偏差 拿到文件夹
 * @param {*} path 
 * @returns 
 */
const getFolderUrl = (path, front, after) => {
	path = path.slice(path.indexOf(":") + 1);
	front = front.slice(front.indexOf(":") + 1);
	let str = path.replace(front + '/', '');
	str = str.replace('/' + after, '');
	return after === str ? [] : str.split('/');
}

/**
 * 获取文件大小
 * @param {*} filePath 
 */
const getFileSize = (filePath) => {
	return fs.statSync(filePath).size;
}

/**
 * 删除路径第一个反斜杠
 * @param {*} path 
 * @returns 
 */
const slicePath = (path) => {
	if (!path) {
		return;
	}
	return path.charAt(0) == '/' ? path.slice(1) : path;
}
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
