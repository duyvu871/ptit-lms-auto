export function contextWrapped(require: string, input: string, output: string) {
    return `
    Tôi có một phần dữ liệu cần xử lý: ${input} với yêu cầu ${require}.
    Đây là định dạng đầu ra mà tôi đã viết để xử lý: ${output}.
    Vui lòng xử lý và trả về kết quả theo định dạng ${output} cho tôi!
    QUAN TRỌNG: trả về kết quả theo đúng định dạng ${output}!, chỉ vậy thôi và không có thông tin nào khác.
    Không có bình luận, không có mã đánh dấu, chỉ trả về văn bản kết quả theo định dạng ${output}.
    `;
}