(function() {
  "use strict";
  
  // レコード作成画面の表示イベント
  kintone.events.on('app.record.create.show', function(event) {
    console.log("レコード作成画面が表示されました！");
    return event;
  });

  // 保存前のイベント（重複チェック）
  kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], checkDuplicate);

  async function checkDuplicate(event) {
    const record = event.record;

    // チェック対象フィールドコード
    const teacherFieldCode = 'nickname';    // 講師名のフィールドコード
    const startFieldCode = 'start_time';    // 開始時刻のフィールドコード
    const endFieldCode = 'end_time';       // 終了時刻のフィールドコード

    const teacherName = record[teacherFieldCode].value;
    const startTime = new Date(record[startFieldCode].value); // 開始時刻
    const endTime = new Date(record[endFieldCode].value);     // 終了時刻

    if (!teacherName || !startTime || !endTime) {
      // フィールドが空の場合はチェックせずに保存
      return event;
    }

    // 現在のレコードID（編集時用）
    const currentRecordId = kintone.app.record.getId();

    // クエリ作成（同じ講師名のデータを取得）
    const query = `${teacherFieldCode} = "${teacherName}" and $id != "${currentRecordId}"`;

    try {
      const resp = await kintone.api(
        kintone.api.url('/k/v1/records', true),
        'GET',
        {
          app: 14, // アプリID
          query: query
        }
      );

      const records = resp.records;

      // 時間帯の重複チェック
      const overlap = records.some(existingRecord => {
        const existingStartTime = new Date(existingRecord[startFieldCode].value);
        const existingEndTime = new Date(existingRecord[endFieldCode].value);

        // 時間帯が重複しているか
        return (
          (startTime < existingEndTime && endTime > existingStartTime) // 時間の重複条件
        );
      });

      if (overlap) {
        event.error = `講師「${teacherName}」の時間帯が他の予定と重複しています。`;
        return event;
      }

      // 重複がない場合はそのまま保存
      return event;
      
    } catch (error) {
      // エラー発生時の処理
      console.error(error);
      event.error = '重複チェック中にエラーが発生しました。';
      return event;
    }
  }
})();